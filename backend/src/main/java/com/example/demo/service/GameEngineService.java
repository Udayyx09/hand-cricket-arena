package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.model.GameRoom;
import com.example.demo.model.MatchRecord;
import com.example.demo.repository.MatchRecordRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
public class GameEngineService {

    private final MatchRecordRepository matchRecordRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final SecureRandom random = new SecureRandom();

    private static final String ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

    public GameEngineService(MatchRecordRepository matchRecordRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.matchRecordRepository = matchRecordRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public CreateRoomResponse createRoom(String preferredPlayerId) {
        String roomCode;
        do {
            StringBuilder sb = new StringBuilder(4);
            for (int i = 0; i < 4; i++) {
                sb.append(ROOM_CHARS.charAt(random.nextInt(ROOM_CHARS.length())));
            }
            roomCode = sb.toString();
        } while (rooms.containsKey(roomCode));

        String playerId = (preferredPlayerId != null && !preferredPlayerId.isBlank())
                ? preferredPlayerId
                : "player_" + UUID.randomUUID().toString().substring(0, 6);

        GameRoom room = new GameRoom(roomCode, playerId);
        rooms.put(roomCode, room);

        return new CreateRoomResponse(roomCode, playerId);
    }

    public JoinRoomResponse joinRoom(String roomCode, String preferredPlayerId) {
        if (roomCode == null) {
            return new JoinRoomResponse("", "", false, "Room code cannot be null");
        }

        GameRoom room = rooms.get(roomCode.toUpperCase().trim());
        if (room == null) {
            return new JoinRoomResponse(roomCode, "", false, "Room not found");
        }

        synchronized (room) {
            String p2Id = (preferredPlayerId != null && !preferredPlayerId.isBlank())
                    ? preferredPlayerId
                    : "player_" + UUID.randomUUID().toString().substring(0, 6);

            // Reconnecting player 1 or player 2
            if (p2Id.equals(room.getPlayerOneId())) {
                broadcastGameState(room, "ROOM_JOINED", -1, "Player 1 reconnected.");
                return new JoinRoomResponse(roomCode, p2Id, true, "Rejoined as Player 1");
            }
            if (p2Id.equals(room.getPlayerTwoId())) {
                broadcastGameState(room, "ROOM_JOINED", -1, "Player 2 reconnected.");
                return new JoinRoomResponse(roomCode, p2Id, true, "Rejoined as Player 2");
            }

            if (room.getPlayerTwoId() != null && !room.getPlayerTwoId().isEmpty()) {
                return new JoinRoomResponse(roomCode, "", false, "Room is full");
            }

            room.setPlayerTwoId(p2Id);
            room.setBatterId(room.getPlayerOneId());
            room.setBowlerId(p2Id);
            room.setInnings(1);
            room.setCurrentEventType("READY");
            room.setStatusMessage("Player 2 joined! Ready for Toss / First Ball.");

            broadcastGameState(room, "ROOM_JOINED", -1, "Friend joined the match!");
            return new JoinRoomResponse(roomCode, p2Id, true, "Joined as Player 2");
        }
    }

    public GameRoom getRoom(String roomCode) {
        if (roomCode == null) return null;
        return rooms.get(roomCode.toUpperCase().trim());
    }

    public void startBallCountdown(String roomCode) {
        GameRoom room = getRoom(roomCode);
        if (room == null) return;

        synchronized (room) {
            if (room.getActiveCountdownTask() != null) {
                room.getActiveCountdownTask().cancel(true);
            }
            if (room.getActiveTimeoutTask() != null) {
                room.getActiveTimeoutTask().cancel(true);
            }

            room.getCurrentBallMoves().clear();
            room.setPlayerOneLastMove(null);
            room.setPlayerTwoLastMove(null);
            room.setCurrentEventType("BALL_COUNTDOWN");

            // Broadcast countdown: 3 -> 2 -> 1 -> LOCK (0)
            ScheduledFuture<?> task = scheduler.scheduleAtFixedRate(new Runnable() {
                private int count = 3;

                @Override
                public void run() {
                    try {
                        if (count > 0) {
                            broadcastGameState(room, "BALL_COUNTDOWN", count,
                                    "BALL INCOMING — Hand up in frame. The throw happens on one.");
                            count--;
                        } else {
                            // Hit 0: Throw lock-in!
                            broadcastGameState(room, "BALL_COUNTDOWN", 0, "LOCK IN THROW NOW!");
                            if (room.getActiveCountdownTask() != null) {
                                room.getActiveCountdownTask().cancel(false);
                            }

                            // Give 1000ms grace period for late network packets, then evaluate
                            ScheduledFuture<?> timeoutTask = scheduler.schedule(() -> {
                                evaluateBall(roomCode);
                            }, 1000, TimeUnit.MILLISECONDS);
                            room.setActiveTimeoutTask(timeoutTask);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }, 0, 1000, TimeUnit.MILLISECONDS);

            room.setActiveCountdownTask(task);
        }
    }

    public void recordPlayerMove(String roomCode, String playerId, int rawMove) {
        GameRoom room = getRoom(roomCode);
        if (room == null) return;

        int move = Math.max(1, Math.min(6, rawMove));

        synchronized (room) {
            room.getCurrentBallMoves().put(playerId, move);

            // If both players have submitted moves, evaluate immediately!
            String p1 = room.getPlayerOneId();
            String p2 = room.getPlayerTwoId();

            if (p1 != null && p2 != null &&
                room.getCurrentBallMoves().containsKey(p1) &&
                room.getCurrentBallMoves().containsKey(p2)) {

                if (room.getActiveTimeoutTask() != null) {
                    room.getActiveTimeoutTask().cancel(false);
                }
                evaluateBall(roomCode);
            }
        }
    }

    public synchronized void evaluateBall(String roomCode) {
        GameRoom room = getRoom(roomCode);
        if (room == null) return;

        synchronized (room) {
            // Prevent double evaluation of the same ball
            if (room.getCurrentEventType().equals("BALL_RESULT") ||
                room.getCurrentEventType().equals("INNINGS_BREAK") ||
                room.isMatchOver()) {
                return;
            }

            String p1 = room.getPlayerOneId();
            String p2 = room.getPlayerTwoId();

            // Strict role verification:
            // 1st Innings: Player 1 (Host) is Batter, Player 2 (Guest) is Bowler
            // 2nd Innings: Player 2 (Guest) is Batter, Player 1 (Host) is Bowler
            if (room.getInnings() == 1) {
                room.setBatterId(p1);
                room.setBowlerId(p2);
            } else {
                room.setBatterId(p2);
                room.setBowlerId(p1);
            }

            String batterId = room.getBatterId();
            String bowlerId = room.getBowlerId();

            // Retrieve moves submitted for each player
            int p1Move = room.getCurrentBallMoves().getOrDefault(p1, random.nextInt(4) + 1);
            int p2Move = room.getCurrentBallMoves().getOrDefault(p2, random.nextInt(4) + 1);

            room.setPlayerOneLastMove(p1Move);
            room.setPlayerTwoLastMove(p2Move);

            // Assign exact throws to batterThrow and bowlerThrow
            int batterMove = batterId.equals(p1) ? p1Move : p2Move;
            int bowlerMove = bowlerId.equals(p1) ? p1Move : p2Move;

            boolean isOut = (batterMove == bowlerMove);

            if (isOut) {
                // BATTER IS OUT!
                if (batterId.equals(p1)) {
                    room.setPlayerOneOut(true);
                } else {
                    room.setPlayerTwoOut(true);
                }

                if (room.getInnings() == 1) {
                    int firstInningsScore = room.getPlayerOneScore();
                    int target = firstInningsScore + 1;
                    room.setTarget(target);

                    // Swap innings & roles: Player 2 bats in 2nd Innings, Player 1 bowls
                    room.setInnings(2);
                    room.setBatterId(p2);
                    room.setBowlerId(p1);
                    room.setCurrentEventType("INNINGS_BREAK");

                    String outcomeMsg = String.format("💥 OUT! Both threw %d. Target to chase is %d runs.", batterMove, target);
                    room.setLastBallOutcome(new BallOutcome(batterMove, bowlerMove, 0, true, outcomeMsg));
                    room.setStatusMessage(outcomeMsg);
                } else {
                    // 2nd Innings OUT: Match Over! Bowler wins!
                    room.setWinnerId(bowlerId);
                    room.setMatchOver(true);
                    room.setCurrentEventType("MATCH_OVER");

                    String outcomeMsg = String.format("🎯 OUT! Both threw %d. %s defended the target and won!",
                            batterMove, (bowlerId.equals(p1) ? "Player 1" : "Player 2"));
                    room.setLastBallOutcome(new BallOutcome(batterMove, bowlerMove, 0, true, outcomeMsg));
                    room.setStatusMessage(outcomeMsg);

                    saveMatchRecord(room);
                }
            } else {
                // RUNS SCORED
                int runs = batterMove;
                if (batterId.equals(p1)) {
                    room.addPlayerOneScore(runs);
                } else {
                    room.addPlayerTwoScore(runs);
                }

                int currentBatterScore = batterId.equals(p1) ? room.getPlayerOneScore() : room.getPlayerTwoScore();

                // Check if target reached in second innings
                if (room.getInnings() == 2 && room.getTarget() != null && currentBatterScore >= room.getTarget()) {
                    room.setWinnerId(batterId);
                    room.setMatchOver(true);
                    room.setCurrentEventType("MATCH_OVER");

                    String outcomeMsg = String.format("🔥 +%d RUNS! Target reached! %s won the match!",
                            runs, (batterId.equals(p1) ? "Player 1" : "Player 2"));
                    room.setLastBallOutcome(new BallOutcome(batterMove, bowlerMove, runs, false, outcomeMsg));
                    room.setStatusMessage(outcomeMsg);

                    saveMatchRecord(room);
                } else {
                    room.setCurrentEventType("BALL_RESULT");
                    String outcomeMsg = String.format("🏏 +%d RUNS! Batter threw %d, Bowler threw %d.",
                            runs, batterMove, bowlerMove);
                    room.setLastBallOutcome(new BallOutcome(batterMove, bowlerMove, runs, false, outcomeMsg));
                    room.setStatusMessage(outcomeMsg);
                }
            }

            broadcastGameState(room, room.getCurrentEventType(), -1, room.getStatusMessage());
        }
    }

    public void resetMatch(String roomCode) {
        GameRoom room = getRoom(roomCode);
        if (room == null) return;
        synchronized (room) {
            room.resetForNewMatch();
            room.setInnings(1);
            room.setBatterId(room.getPlayerOneId());
            room.setBowlerId(room.getPlayerTwoId());
            broadcastGameState(room, "READY", -1, "Match restarted! Ready for first ball.");
        }
    }

    private void saveMatchRecord(GameRoom room) {
        try {
            MatchRecord record = new MatchRecord(
                    room.getRoomCode(),
                    room.getPlayerOneId(),
                    room.getPlayerTwoId(),
                    room.getPlayerOneScore(),
                    room.getPlayerTwoScore(),
                    room.getWinnerId(),
                    LocalDateTime.now()
            );
            matchRecordRepository.save(record);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public HeadToHeadStats getHeadToHead(String p1, String p2) {
        if (p1 == null || p2 == null) {
            return new HeadToHeadStats(p1, p2, 0, 0);
        }
        List<MatchRecord> matches = matchRecordRepository.findHeadToHeadMatches(p1, p2);
        int won = 0;
        int lost = 0;
        for (MatchRecord m : matches) {
            if (p1.equals(m.getWinnerId())) {
                won++;
            } else if (p2.equals(m.getWinnerId())) {
                lost++;
            }
        }
        return new HeadToHeadStats(p1, p2, won, lost);
    }

    public void relaySignal(String roomCode, WebRtcSignal signal) {
        messagingTemplate.convertAndSend("/topic/room/" + roomCode + "/signal", signal);
    }

    public void broadcastGameState(GameRoom room, String eventType, int countdown, String statusMsg) {
        HeadToHeadStats p1Stats = getHeadToHead(room.getPlayerOneId(), room.getPlayerTwoId());
        HeadToHeadStats p2Stats = getHeadToHead(room.getPlayerTwoId(), room.getPlayerOneId());

        GameStateMessage msg = new GameStateMessage(
                room.getRoomCode(),
                eventType,
                countdown,
                room.getPlayerOneId(),
                room.getPlayerTwoId(),
                room.getBatterId(),
                room.getBowlerId(),
                room.getPlayerOneScore(),
                room.getPlayerTwoScore(),
                room.getInnings(),
                room.getTarget(),
                room.isPlayerOneOut(),
                room.isPlayerTwoOut(),
                room.getPlayerOneLastMove(),
                room.getPlayerTwoLastMove(),
                room.getLastBallOutcome(),
                room.getWinnerId(),
                p1Stats.won(),
                p1Stats.lost(),
                p2Stats.won(),
                p2Stats.lost(),
                statusMsg != null ? statusMsg : room.getStatusMessage()
        );

        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomCode() + "/state", msg);
    }
}
