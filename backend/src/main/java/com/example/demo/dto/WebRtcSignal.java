package com.example.demo.dto;

public record WebRtcSignal(
        String senderId,
        String type, // 'offer', 'answer', 'ice-candidate'
        Object data
) {}
