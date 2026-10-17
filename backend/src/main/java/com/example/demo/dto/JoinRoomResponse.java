package com.example.demo.dto;

public record JoinRoomResponse(
        String roomCode,
        String playerId,
        boolean success,
        String message
) {}
