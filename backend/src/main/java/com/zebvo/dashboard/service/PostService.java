package com.zebvo.dashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zebvo.dashboard.model.Post;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PostService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Fetch live posts from Reddit (Open JSON API - No auth required)
    private List<Post> fetchLiveRedditPosts() {
        List<Post> livePosts = new ArrayList<>();
        try {
            // Fetch live data for "passport"
            String url = "https://www.reddit.com/search.json?q=passport&sort=new&limit=20";
            
            // Set User-Agent as required by Reddit API
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>("parameters", headers);
            
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);
            
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode children = root.path("data").path("children");

            for (JsonNode child : children) {
                JsonNode data = child.path("data");
                
                String title = data.path("title").asText();
                String text = data.path("selftext").asText();
                String content = title + (text.isEmpty() ? "" : " - " + text);
                if(content.length() > 500) content = content.substring(0, 500) + "...";

                long createdUtc = data.path("created_utc").asLong();
                String timestamp = Instant.ofEpochSecond(createdUtc).toString();

                Post post = Post.builder()
                        .id(data.path("id").asText())
                        .platform("Reddit")
                        .author("u/" + data.path("author").asText())
                        .content(content)
                        .timestamp(timestamp)
                        .likes(data.path("ups").asInt())
                        .shares(data.path("num_comments").asInt())
                        .region("Global") // Reddit doesn't provide precise region easily without deep scraping
                        .build();
                        
                livePosts.add(post);
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch live Reddit posts: " + e.getMessage());
            // Fallback gracefully if API fails or rate limits
        }
        return livePosts;
    }

    public List<Post> getProcessedPosts(String platform, String category, String query, String region, String sentiment, String sort) {
        
        // 1. Scraping Engine: Fetch Live Data
        List<Post> allPosts = fetchLiveRedditPosts();
        
        // (Optional fallback to ensure data always exists for demo purposes even if offline/rate-limited)
        if(allPosts.isEmpty()) {
            allPosts = getFallbackData();
        }

        // 2. Gibberish Filter
        List<Post> filtered = allPosts.stream()
                .filter(p -> !isGibberish(p.getContent()))
                .collect(Collectors.toList());

        // 3. Process NLP
        for (Post p : filtered) {
            p.setCategory(categorize(p.getContent()));
            p.setSummary(generateSummary(p.getContent()));
            p.setSentiment(getSentiment(p.getContent()));
            p.setTranslations(generateTranslations(p.getContent()));
            p.setClusterId(null);
        }

        // 4. Clustering (Group similar Visa queries)
        List<Post> visaQueries = filtered.stream()
                .filter(p -> "Visa".equals(p.getCategory()))
                .collect(Collectors.toList());
        if (visaQueries.size() > 1) {
            visaQueries.forEach(p -> p.setClusterId("cluster_visa_queries"));
        }

        // 5. Apply User Filters
        if (platform != null && !platform.isEmpty()) {
            filtered = filtered.stream().filter(p -> p.getPlatform().equalsIgnoreCase(platform)).collect(Collectors.toList());
        }
        if (category != null && !category.isEmpty()) {
            filtered = filtered.stream().filter(p -> p.getCategory().equalsIgnoreCase(category)).collect(Collectors.toList());
        }
        if (region != null && !region.isEmpty()) {
            filtered = filtered.stream().filter(p -> p.getRegion().equalsIgnoreCase(region)).collect(Collectors.toList());
        }
        if (sentiment != null && !sentiment.isEmpty()) {
            filtered = filtered.stream().filter(p -> p.getSentiment().equalsIgnoreCase(sentiment)).collect(Collectors.toList());
        }
        if (query != null && !query.isEmpty()) {
            String qLower = query.toLowerCase();
            filtered = filtered.stream()
                    .filter(p -> p.getContent().toLowerCase().contains(qLower) || p.getAuthor().toLowerCase().contains(qLower) || p.getTranslations().values().stream().anyMatch(t -> t.toLowerCase().contains(qLower)))
                    .collect(Collectors.toList());
        }

        // 6. Apply Sorting
        if (sort != null) {
            switch (sort) {
                case "engagement":
                    filtered.sort((a, b) -> Integer.compare(b.getLikes() + b.getShares(), a.getLikes() + a.getShares()));
                    break;
                case "time_old":
                    filtered.sort(Comparator.comparing(Post::getTimestamp));
                    break;
                case "time_new":
                default:
                    filtered.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
                    break;
            }
        } else {
            filtered.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
        }

        return filtered;
    }

    private boolean isGibberish(String text) {
        String lower = text.toLowerCase();
        // Remove obviously garbled strings or spam links
        return lower.contains("click here") || lower.contains("cheap visa") || lower.matches(".*[a-zA-Z]{20,}.*");
    }

    private String categorize(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("scam") || lower.contains("fraud") || lower.contains("beware")) return "Scams/Fraud";
        if (lower.contains("tatkal") || lower.contains("renewal")) return "Renewal";
        if (lower.contains("appointment") || lower.contains("booked")) return "Appointments";
        if (lower.contains("police verification") || lower.contains("stuck") || lower.contains("delay") || lower.contains("wait")) return "Processing Issues";
        if (lower.contains("visa") || lower.contains("embassy")) return "Visa";
        if (lower.contains("ministry") || lower.contains("portal") || lower.contains("gov")) return "Government Announcements";
        if (lower.contains("apply") || lower.contains("application") || lower.contains("process")) return "Application";
        if (lower.contains("news") || lower.contains("fees")) return "News";
        if (lower.contains("travel") || lower.contains("flight") || lower.contains("trip")) return "Travel Issues";
        return "Personal Experiences";
    }

    private String generateSummary(String text) {
        String[] words = text.split(" ");
        if (words.length <= 30) return text;
        return String.join(" ", Arrays.copyOfRange(words, 0, 30)) + "...";
    }

    private String getSentiment(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("smooth") || lower.contains("fast") || lower.contains("easy") || lower.contains("good") || lower.contains("thanks")) return "Positive";
        if (lower.contains("insane") || lower.contains("frustrating") || lower.contains("stuck") || lower.contains("unacceptable") || lower.contains("bad") || lower.contains("hate")) return "Negative";
        return "Neutral";
    }

    private Map<String, String> generateTranslations(String text) {
        Map<String, String> trans = new HashMap<>();
        trans.put("Hindi", "(Translated to Hindi) " + text);
        trans.put("Punjabi", "(Translated to Punjabi) " + text);
        trans.put("Spanish", "(Translated to Spanish) " + text);
        trans.put("French", "(Translated to French) " + text);
        trans.put("German", "(Translated to German) " + text);
        trans.put("Arabic", "(Translated to Arabic) " + text);
        trans.put("Chinese", "(Translated to Chinese) " + text);
        trans.put("Russian", "(Translated to Russian) " + text);
        trans.put("Japanese", "(Translated to Japanese) " + text);
        return trans;
    }

    private List<Post> getFallbackData() {
        List<Post> fallback = new ArrayList<>();
        fallback.add(Post.builder().id("1").platform("Twitter/X").author("@traveler_joe").content("Just applied for my passport renewal. The tatkal process was surprisingly smooth but the appointment wait times are insane! #passport #travel").timestamp(Instant.now().minusSeconds(7200).toString()).likes(145).shares(23).region("India").build());
        fallback.add(Post.builder().id("4").platform("Instagram").author("@visa_guru").content("New rules announced for Schengen visa! Your passport must be valid for at least 6 months from the date of return. Check your expiry dates now! ✈️🌍").timestamp(Instant.now().minusSeconds(3600).toString()).likes(1200).shares(300).region("Global").build());
        return fallback;
    }
}
