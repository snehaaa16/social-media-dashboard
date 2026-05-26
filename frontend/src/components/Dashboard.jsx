import React, { useState, useEffect } from "react";
import {
  Download,
  Search,
  Filter,
  Globe,
  Activity,
  Clock,
  ThumbsUp,
  Share2,
  Layers,
  Printer,
} from "lucide-react";

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters and sorting
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("time_new");

  const [selectedLangs, setSelectedLangs] = useState({});

  useEffect(() => {
    fetchPosts();
  }, [
    platformFilter,
    categoryFilter,
    regionFilter,
    sentimentFilter,
    sortFilter,
  ]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter) params.append("platform", platformFilter);
      if (categoryFilter) params.append("category", categoryFilter);
      if (regionFilter) params.append("region", regionFilter);
      if (sentimentFilter) params.append("sentiment", sentimentFilter);
      if (sortFilter) params.append("sort", sortFilter);
      if (search) params.append("q", search);

      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8080/api/posts";
      const res = await fetch(`${apiUrl}?${params.toString()}`);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      setPosts(data || []);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPosts();
  };

  const handleExportCSV = () => {
    if (!posts.length) return;
    const headers = [
      "ID",
      "Platform",
      "Author",
      "Category",
      "Sentiment",
      "Summary",
      "Region",
    ];
    const rows = posts.map((p) => [
      p.id,
      p.platform,
      p.author,
      p.category,
      p.sentiment,
      `"${p.summary}"`,
      p.region,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "passport_posts_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    // A quick hack to simulate PDF export by printing the dashboard window.
    window.print();
  };

  const handleLanguageChange = (postId, lang) => {
    setSelectedLangs((prev) => ({ ...prev, [postId]: lang }));
  };

  const renderPosts = () => {
    const clusteredPosts = {};
    const unclusteredPosts = [];

    posts.forEach((post) => {
      if (post.clusterId) {
        if (!clusteredPosts[post.clusterId])
          clusteredPosts[post.clusterId] = [];
        clusteredPosts[post.clusterId].push(post);
      } else {
        unclusteredPosts.push(post);
      }
    });

    const elements = [];

    Object.keys(clusteredPosts).forEach((clusterId) => {
      const cluster = clusteredPosts[clusterId];
      elements.push(
        <div
          key={clusterId}
          className="glass-panel"
          style={{
            padding: "1.5rem",
            marginBottom: "1.5rem",
            borderLeft: "4px solid var(--accent-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
              color: "var(--accent-color)",
            }}
          >
            <Layers size={20} />
            <h4 style={{ margin: 0 }}>
              Cluster Topic: {cluster[0].category} ({cluster.length} similar
              posts)
            </h4>
          </div>
          <div style={{ display: "grid", gap: "1rem" }}>
            {cluster.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                lang={selectedLangs[post.id] || "English"}
                onLangChange={(l) => handleLanguageChange(post.id, l)}
              />
            ))}
          </div>
        </div>,
      );
    });

    unclusteredPosts.forEach((post) => {
      elements.push(
        <div key={post.id} style={{ marginBottom: "1rem" }}>
          <PostCard
            post={post}
            lang={selectedLangs[post.id] || "English"}
            onLangChange={(l) => handleLanguageChange(post.id, l)}
          />
        </div>,
      );
    });

    return elements;
  };

  return (
    <div style={{ padding: "2rem 0" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1>Zebvo Social Tracker</h1>
          <p>Real-time dashboard for passport-related social media insights.</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="btn-secondary" onClick={handleExportPDF}>
            <Printer size={18} /> Export PDF
          </button>
          <button className="btn-primary" onClick={handleExportCSV}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </header>

      <div
        className="glass-panel"
        style={{ padding: "1.5rem", marginBottom: "2rem" }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <div style={{ flex: "1", minWidth: "250px", position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
              }}
            />
            <input
              type="text"
              className="input-glass"
              placeholder="Search posts, handles, or topics..."
              style={{ width: "100%", paddingLeft: "2.5rem" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input-glass"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="">All Platforms</option>
            <option value="Twitter/X">Twitter/X</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="Reddit">Reddit</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
          </select>

          <select
            className="input-glass"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Application">Application</option>
            <option value="Renewal">Renewal</option>
            <option value="Appointments">Appointments</option>
            <option value="Tatkal">Tatkal</option>
            <option value="Visa">Visa</option>
            <option value="Travel Issues">Travel Issues</option>
            <option value="Government Announcements">Gov Announcements</option>
            <option value="Scams/Fraud">Scams/Fraud</option>
            <option value="News">News</option>
            <option value="Personal Experiences">Personal Experiences</option>
          </select>

          <button type="submit" className="btn-secondary">
            <Filter size={18} /> Search
          </button>
        </form>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <select
            className="input-glass"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            style={{ padding: "0.5rem", fontSize: "0.9rem" }}
          >
            <option value="">All Regions</option>
            <option value="India">India</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="Global">Global</option>
          </select>

          <select
            className="input-glass"
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            style={{ padding: "0.5rem", fontSize: "0.9rem" }}
          >
            <option value="">All Sentiments</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Neutral">Neutral</option>
          </select>

          <select
            className="input-glass"
            value={sortFilter}
            onChange={(e) => setSortFilter(e.target.value)}
            style={{
              padding: "0.5rem",
              fontSize: "0.9rem",
              marginLeft: "auto",
            }}
          >
            <option value="time_new">Sort: Newest First</option>
            <option value="time_old">Sort: Oldest First</option>
            <option value="engagement">Sort: Most Engagement</option>
          </select>
        </div>
      </div>

      <div className="grid-layout">
        <aside>
          <div
            className="glass-panel"
            style={{ padding: "1.5rem", position: "sticky", top: "2rem" }}
          >
            <h3
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Activity size={20} color="var(--accent-color)" /> Live Statistics
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <StatBox
                label="Total Posts Analyzed"
                value={loading ? "..." : posts.length}
              />
              <StatBox label="Spam Filtered" value="12%" />
              <StatBox label="Top Category" value="Processing Issues" />
            </div>
          </div>
        </aside>

        <section>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-secondary)",
              }}
            >
              <div>Loading insights...</div>
            </div>
          ) : posts.length === 0 ? (
            <div
              className="glass-panel"
              style={{ padding: "3rem", textAlign: "center" }}
            >
              <p>No posts found matching your criteria.</p>
            </div>
          ) : (
            <div>{renderPosts()}</div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.2)",
        padding: "1rem",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          marginBottom: "0.25rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PostCard({ post, lang, onLangChange }) {
  const getBadgeColor = (sentiment) => {
    if (sentiment === "Positive") return "badge-green";
    if (sentiment === "Negative") return "badge-red";
    return "badge-blue";
  };

  const contentToDisplay =
    lang === "English" ? post.content : post.translations[lang] || post.content;

  return (
    <div className="glass-card" style={{ padding: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.25rem",
            }}
          >
            <span style={{ fontWeight: "600", color: "white" }}>
              {post.author}
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <Clock size={14} />{" "}
              {new Date(post.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span
              className="badge"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid var(--border-color)",
              }}
            >
              {post.platform}
            </span>
            <span
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
            >
              📍 {post.region}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <span className={`badge ${getBadgeColor(post.sentiment)}`}>
              {post.sentiment}
            </span>
            <span className="badge badge-purple">{post.category}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Globe size={16} color="var(--text-secondary)" />
          <select
            className="input-glass"
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Punjabi">Punjabi</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Arabic">Arabic</option>
            <option value="Chinese">Chinese</option>
            <option value="Russian">Russian</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>
      </div>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "1.05rem",
          marginBottom: "1rem",
        }}
      >
        {contentToDisplay}
      </p>

      <div
        style={{
          background: "rgba(0,0,0,0.2)",
          padding: "0.75rem",
          borderRadius: "8px",
          borderLeft: "3px solid var(--accent-color)",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            marginBottom: "0.25rem",
            fontWeight: "bold",
          }}
        >
          Summary (~30 words)
        </div>
        <p style={{ fontSize: "0.9rem", margin: 0 }}>{post.summary}</p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          color: "var(--text-secondary)",
          fontSize: "0.9rem",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <ThumbsUp size={16} /> {post.likes}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Share2 size={16} /> {post.shares}
        </span>
      </div>
    </div>
  );
}
