package com.example.demo.dto;

public record HeadToHeadStats(
        String playerId,
        String opponentId,
        int won,
        int lost
) {}
