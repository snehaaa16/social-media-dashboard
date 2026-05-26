package com.zebvo.dashboard.controller;

import com.zebvo.dashboard.model.Post;
import com.zebvo.dashboard.service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
public class PostController {

    @Autowired
    private PostService postService;

    @GetMapping("/api/posts")
    public List<Post> getPosts(
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String category,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String sentiment,
            @RequestParam(required = false) String sort) {
        
        return postService.getProcessedPosts(platform, category, query, region, sentiment, sort);
    }
}
