package com.example.demo.dto;

public record GameStateMessage(
        String roomCode,
        String eventType,
        int countdown,
        String playerOneId,
        String playerTwoId,
        String batterId,
        String bowlerId,
        int playerOneScore,
        int playerTwoScore,
        int innings,
        Integer target,
        boolean playerOneOut,
        boolean playerTwoOut,
        Integer playerOneLastMove,
        Integer playerTwoLastMove,
        BallOutcome lastBallOutcome,
        String winnerId,
        int p1Won,
        int p1Lost,
        int p2Won,
        int p2Lost,
        String statusMessage
) {}
