package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.model.GameRoom;
import com.example.demo.service.GameEngineService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(originPatterns = "*", allowedHeaders = "*")
public class HandCricketController {

    private final GameEngineService gameEngineService;

    public HandCricketController(GameEngineService gameEngineService) {
        this.gameEngineService = gameEngineService;
    }

    // --- REST Endpoints ---

    @PostMapping("/api/rooms/create")
    public ResponseEntity<CreateRoomResponse> createRoom(
            @RequestParam(required = false) String playerId) {
        CreateRoomResponse response = gameEngineService.createRoom(playerId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/rooms/{roomId}/join")
    public ResponseEntity<JoinRoomResponse> joinRoom(
            @PathVariable String roomId,
            @RequestBody(required = false) JoinRoomRequest request) {
        String playerId = (request != null) ? request.playerId() : null;
        JoinRoomResponse response = gameEngineService.joinRoom(roomId, playerId);
        if (response.success()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/api/rooms/{roomId}")
    public ResponseEntity<?> getRoomState(@PathVariable String roomId) {
        GameRoom room = gameEngineService.getRoom(roomId);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(room);
    }

    @GetMapping("/api/stats/{p1}/{p2}")
    public ResponseEntity<HeadToHeadStats> getHeadToHead(
            @PathVariable String p1,
            @PathVariable String p2) {
        return ResponseEntity.ok(gameEngineService.getHeadToHead(p1, p2));
    }

    // --- WebSocket STOMP Message Mappings ---

    /**
     * Triggers the synchronized 3-2-1 ball countdown for both players.
     */
    @MessageMapping("/room/{roomId}/start-ball")
    public void startBall(@DestinationVariable String roomId) {
        gameEngineService.startBallCountdown(roomId);
    }

    /**
     * Receives locked-in hand gesture moves (1 to 6) from each player.
     */
    @MessageMapping("/room/{roomId}/move")
    public void submitMove(
            @DestinationVariable String roomId,
            @Payload PlayerMoveRequest moveRequest) {
        gameEngineService.recordPlayerMove(roomId, moveRequest.playerId(), moveRequest.move());
    }

    /**
     * Relays WebRTC signaling payloads (offer, answer, ICE candidates)
     * between the two players for peer-to-peer webcam streaming.
     */
    @MessageMapping("/room/{roomId}/signal")
    public void handleWebRtcSignal(
            @DestinationVariable String roomId,
            @Payload WebRtcSignal signal) {
        gameEngineService.relaySignal(roomId, signal);
    }

    /**
     * Resets the room for a rematch.
     */
    @MessageMapping("/room/{roomId}/reset")
    public void resetMatch(@DestinationVariable String roomId) {
        gameEngineService.resetMatch(roomId);
    }

    /**
     * Client requests immediate room state broadcast.
     */
    @MessageMapping("/room/{roomId}/sync")
    public void syncRoom(@DestinationVariable String roomId) {
        gameEngineService.syncGameState(roomId);
    }
}
