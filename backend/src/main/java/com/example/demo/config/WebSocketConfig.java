package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket STOMP endpoints (support both /ws and /ws-cricket)
        registry.addEndpoint("/ws", "/ws-cricket")
                .setAllowedOriginPatterns("*");

        // SockJS fallback STOMP endpoints
        registry.addEndpoint("/ws", "/ws-cricket")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Broadcast broker prefix
        config.enableSimpleBroker("/topic");
        // Application incoming message prefix
        config.setApplicationDestinationPrefixes("/app");
    }
}
