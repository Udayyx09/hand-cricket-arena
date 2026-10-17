package com.example.demo.dto;

public record BallOutcome(
        int batterMove,
        int bowlerMove,
        int runsScored,
        boolean isOut,
        String outcomeMessage
) {}
