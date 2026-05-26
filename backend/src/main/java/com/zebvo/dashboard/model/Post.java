package com.zebvo.dashboard.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Post {
    private String id;
    private String platform;
    private String author;
    private String content;
    private String summary;
    private String category;
    private String sentiment;
    private String timestamp;
    private int likes;
    private int shares;
    private String region;
    private String clusterId;
    private Map<String, String> translations;
}
