package com.example.demo.model;

import com.example.demo.dto.BallOutcome;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

public class GameRoom {
    private final String roomCode;
    private String playerOneId;
    private String playerTwoId;
    private String batterId;
    private String bowlerId;

    private int playerOneScore = 0;
    private int playerTwoScore = 0;
    private int innings = 1;
    private Integer target = null;

    private boolean playerOneOut = false;
    private boolean playerTwoOut = false;

    private Integer playerOneLastMove = null;
    private Integer playerTwoLastMove = null;
    private BallOutcome lastBallOutcome = null;

    private String winnerId = null;
    private boolean matchOver = false;
    private String currentEventType = "WAITING_FOR_PLAYER";
    private String statusMessage = "Waiting for Player 2 to join...";

    private final Map<String, Integer> currentBallMoves = new ConcurrentHashMap<>();
    private ScheduledFuture<?> activeCountdownTask;
    private ScheduledFuture<?> activeTimeoutTask;

    public GameRoom(String roomCode, String playerOneId) {
        this.roomCode = roomCode;
        this.playerOneId = playerOneId;
        this.batterId = playerOneId; // Player 1 bats first by default
    }

    public synchronized void resetForNewMatch() {
        this.playerOneScore = 0;
        this.playerTwoScore = 0;
        this.innings = 1;
        this.target = null;
        this.playerOneOut = false;
        this.playerTwoOut = false;
        this.playerOneLastMove = null;
        this.playerTwoLastMove = null;
        this.lastBallOutcome = null;
        this.winnerId = null;
        this.matchOver = false;
        this.currentBallMoves.clear();
        this.batterId = playerOneId;
        this.bowlerId = playerTwoId;
        this.currentEventType = "READY";
        this.statusMessage = "New Match! Player 1 is batting.";
    }

    public String getRoomCode() {
        return roomCode;
    }

    public synchronized String getPlayerOneId() {
        return playerOneId;
    }

    public synchronized void setPlayerOneId(String playerOneId) {
        this.playerOneId = playerOneId;
    }

    public synchronized String getPlayerTwoId() {
        return playerTwoId;
    }

    public synchronized void setPlayerTwoId(String playerTwoId) {
        this.playerTwoId = playerTwoId;
    }

    public synchronized String getBatterId() {
        return batterId;
    }

    public synchronized void setBatterId(String batterId) {
        this.batterId = batterId;
    }

    public synchronized String getBowlerId() {
        return bowlerId;
    }

    public synchronized void setBowlerId(String bowlerId) {
        this.bowlerId = bowlerId;
    }

    public synchronized int getPlayerOneScore() {
        return playerOneScore;
    }

    public synchronized void setPlayerOneScore(int playerOneScore) {
        this.playerOneScore = playerOneScore;
    }

    public synchronized void addPlayerOneScore(int runs) {
        this.playerOneScore += runs;
    }

    public synchronized int getPlayerTwoScore() {
        return playerTwoScore;
    }

    public synchronized void setPlayerTwoScore(int playerTwoScore) {
        this.playerTwoScore = playerTwoScore;
    }

    public synchronized void addPlayerTwoScore(int runs) {
        this.playerTwoScore += runs;
    }

    public synchronized int getInnings() {
        return innings;
    }

    public synchronized void setInnings(int innings) {
        this.innings = innings;
    }

    public synchronized Integer getTarget() {
        return target;
    }

    public synchronized void setTarget(Integer target) {
        this.target = target;
    }

    public synchronized boolean isPlayerOneOut() {
        return playerOneOut;
    }

    public synchronized void setPlayerOneOut(boolean playerOneOut) {
        this.playerOneOut = playerOneOut;
    }

    public synchronized boolean isPlayerTwoOut() {
        return playerTwoOut;
    }

    public synchronized void setPlayerTwoOut(boolean playerTwoOut) {
        this.playerTwoOut = playerTwoOut;
    }

    public synchronized Integer getPlayerOneLastMove() {
        return playerOneLastMove;
    }

    public synchronized void setPlayerOneLastMove(Integer playerOneLastMove) {
        this.playerOneLastMove = playerOneLastMove;
    }

    public synchronized Integer getPlayerTwoLastMove() {
        return playerTwoLastMove;
    }

    public synchronized void setPlayerTwoLastMove(Integer playerTwoLastMove) {
        this.playerTwoLastMove = playerTwoLastMove;
    }

    public synchronized BallOutcome getLastBallOutcome() {
        return lastBallOutcome;
    }

    public synchronized void setLastBallOutcome(BallOutcome lastBallOutcome) {
        this.lastBallOutcome = lastBallOutcome;
    }

    public synchronized String getWinnerId() {
        return winnerId;
    }

    public synchronized void setWinnerId(String winnerId) {
        this.winnerId = winnerId;
    }

    public synchronized boolean isMatchOver() {
        return matchOver;
    }

    public synchronized void setMatchOver(boolean matchOver) {
        this.matchOver = matchOver;
    }

    public synchronized String getCurrentEventType() {
        return currentEventType;
    }

    public synchronized void setCurrentEventType(String currentEventType) {
        this.currentEventType = currentEventType;
    }

    public synchronized String getStatusMessage() {
        return statusMessage;
    }

    public synchronized void setStatusMessage(String statusMessage) {
        this.statusMessage = statusMessage;
    }

    public Map<String, Integer> getCurrentBallMoves() {
        return currentBallMoves;
    }

    public synchronized ScheduledFuture<?> getActiveCountdownTask() {
        return activeCountdownTask;
    }

    public synchronized void setActiveCountdownTask(ScheduledFuture<?> activeCountdownTask) {
        this.activeCountdownTask = activeCountdownTask;
    }

    public synchronized ScheduledFuture<?> getActiveTimeoutTask() {
        return activeTimeoutTask;
    }

    public synchronized void setActiveTimeoutTask(ScheduledFuture<?> activeTimeoutTask) {
        this.activeTimeoutTask = activeTimeoutTask;
    }
}
