package com.example.demo.dto;

public record PlayerMoveRequest(
        String playerId,
        int move
) {}
