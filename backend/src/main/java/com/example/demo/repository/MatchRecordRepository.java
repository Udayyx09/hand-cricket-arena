package com.example.demo.repository;

import com.example.demo.model.MatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchRecordRepository extends JpaRepository<MatchRecord, Long> {

    @Query("SELECT m FROM MatchRecord m WHERE " +
           "(m.playerOneId = :p1 AND m.playerTwoId = :p2) OR " +
           "(m.playerOneId = :p2 AND m.playerTwoId = :p1) " +
           "ORDER BY m.playedAt DESC")
    List<MatchRecord> findHeadToHeadMatches(@Param("p1") String p1, @Param("p2") String p2);

    List<MatchRecord> findByRoomCodeOrderByPlayedAtDesc(String roomCode);
}
