"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";

type PropertyAd = {
  id: string;
  url: string;
  source: string;
  title: string;
  price?: number;
  location: string;
  size?: number;
  rooms?: number;
  bathrooms?: number;
  description: string;
  descriptionSummary: string;
  renovationStatus: string;
  features: string[];
  status: string;
  notes?: string;
  adAge: string;
  scrapedAt: string;
};

type QuestionAnswer = {
  id: string;
  question: string;
  answer: string;
  askedAt: string;
};

export default function ResearchPage() {
  const params = useParams();
  const name = params.name as string;

  const [criteria, setCriteria] = useState("");
  const [ads, setAds] = useState<PropertyAd[]>([]);
  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // URL submission
  const [url, setUrl] = useState("");
  const [submittingUrl, setSubmittingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");

  // Question submission
  const [question, setQuestion] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState("");

  // Filtering and sorting
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Selected apartment for detail view
  const [selectedAd, setSelectedAd] = useState<PropertyAd | null>(null);

  // Expanded question ID for accordion
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [criteriaRes, adsRes, questionsRes] = await Promise.all([
          fetch(`/api/research/${name}`),
          fetch(`/api/ads/${name}`),
          fetch(`/api/questions/${name}`),
        ]);

        if (!criteriaRes.ok || !adsRes.ok || !questionsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const criteriaData = await criteriaRes.json();
        const adsData = await adsRes.json();
        const questionsData = await questionsRes.json();

        setCriteria(criteriaData.criteria);
        setAds(adsData.ads);
        setQuestions(questionsData.questions);

        // Expand the most recent question by default
        if (questionsData.questions.length > 0) {
          const mostRecent = questionsData.questions[questionsData.questions.length - 1];
          setExpandedQuestionId(mostRecent.id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [name]);

  // Submit URL
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError("");
    setSubmittingUrl(true);

    try {
      const response = await fetch(`/api/ads/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add property");
      }

      const newAd = await response.json();
      setAds([...ads, newAd]);
      setUrl("");
    } catch (err: unknown) {
      setUrlError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmittingUrl(false);
    }
  };

  // Update status
  const handleStatusChange = async (adId: string, status: string) => {
    try {
      const response = await fetch(`/api/ads/${name}/${adId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setAds(ads.map((ad) => (ad.id === adId ? { ...ad, status } : ad)));
    } catch (err: unknown) {
      alert("Error updating status: " + (err instanceof Error ? err.message : "An error occurred"));
    }
  };

  // Update notes
  const handleNotesBlur = async (adId: string, notes: string) => {
    try {
      const response = await fetch(`/api/ads/${name}/${adId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) throw new Error("Failed to update notes");

      setAds(ads.map((ad) => (ad.id === adId ? { ...ad, notes } : ad)));
    } catch (err: unknown) {
      alert("Error updating notes: " + (err instanceof Error ? err.message : "An error occurred"));
    }
  };

  // Submit question
  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setQuestionError("");
    setSubmittingQuestion(true);

    try {
      const response = await fetch(`/api/questions/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to ask question");
      }

      const data = await response.json();
      const newQuestion = {
        id: Date.now().toString(),
        question: data.question,
        answer: data.answer,
        askedAt: new Date().toISOString(),
      };
      setQuestions([
        ...questions,
        newQuestion,
      ]);
      setExpandedQuestionId(newQuestion.id);
      setQuestion("");
    } catch (err: unknown) {
      setQuestionError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Filter and sort ads
  const filteredAndSortedAds = useMemo(() => {
    let result = [...ads];

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((ad) => ad.status === statusFilter);
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField as keyof PropertyAd];
        const bVal = b[sortField as keyof PropertyAd];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [ads, statusFilter, sortField, sortDirection]);

  // Toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (loading) {
    return <div style={{ padding: "50px", textAlign: "center" }}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "50px", textAlign: "center", color: "red" }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "15px 20px", borderBottom: "1px solid #ddd", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", marginBottom: "5px" }}>{name}</h1>
            <div style={{ fontSize: "14px", color: "#666" }}>{criteria}</div>
          </div>
          <label>
            <strong>Filter: </strong>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "5px", fontSize: "14px" }}
            >
              <option value="all">All</option>
              <option value="to reach out">To reach out</option>
              <option value="visit appointment taken">Visit appointment taken</option>
              <option value="sent the offer">Sent the offer</option>
              <option value="bought">Bought</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>

        {/* URL submission */}
        <form onSubmit={handleUrlSubmit} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.idealista.it/... or https://www.immobiliare.it/..."
            style={{
              flex: 1,
              padding: "6px 10px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            disabled={submittingUrl}
          />
          <button
            type="submit"
            disabled={submittingUrl}
            style={{
              padding: "6px 16px",
              fontSize: "14px",
              backgroundColor: submittingUrl ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: submittingUrl ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            {submittingUrl ? "Scraping..." : "Add"}
          </button>
          {urlError && <span style={{ color: "red", fontSize: "12px" }}>{urlError}</span>}
        </form>
      </div>

      {/* Top section: Table and Q&A sidebar */}
      <div style={{ display: "flex", flex: selectedAd ? "1 1 50%" : "1 1 100%", overflow: "hidden", borderBottom: selectedAd ? "2px solid #ddd" : "none", minHeight: 0 }}>
        {/* Left: Table */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #ddd" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {/* Ads table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #ddd",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ border: "1px solid #ddd", padding: "10px", cursor: "pointer" }}>
                Title
              </th>
              <th
                style={{ border: "1px solid #ddd", padding: "10px", cursor: "pointer" }}
                onClick={() => toggleSort("price")}
              >
                Price {sortField === "price" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Location</th>
              <th
                style={{ border: "1px solid #ddd", padding: "10px", cursor: "pointer" }}
                onClick={() => toggleSort("size")}
              >
                Size {sortField === "size" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Rooms</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Renovation</th>
              <th
                style={{ border: "1px solid #ddd", padding: "10px", cursor: "pointer" }}
                onClick={() => toggleSort("status")}
              >
                Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAds.map((ad) => (
              <tr
                key={ad.id}
                onClick={() => {
                  console.log("Selected ad:", ad);
                  setSelectedAd(ad);
                }}
                style={{
                  cursor: "pointer",
                  backgroundColor: selectedAd?.id === ad.id ? "#e3f2fd" : "transparent"
                }}
                onMouseEnter={(e) => {
                  if (selectedAd?.id !== ad.id) {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAd?.id !== ad.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  <a href={ad.url} target="_blank" rel="noopener noreferrer">
                    {ad.title}
                  </a>
                  <br />
                  <small>{ad.adAge}</small>
                </td>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  {ad.price ? `€${ad.price.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>{ad.location}</td>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  {ad.size ? `${ad.size}m²` : "N/A"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  {ad.rooms || "N/A"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  {ad.renovationStatus}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  <select
                    value={ad.status}
                    onChange={(e) => handleStatusChange(ad.id, e.target.value)}
                    style={{ padding: "5px", fontSize: "14px", width: "100%" }}
                  >
                    <option value="to reach out">To reach out</option>
                    <option value="visit appointment taken">Visit appointment taken</option>
                    <option value="sent the offer">Sent the offer</option>
                    <option value="bought">Bought</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  <textarea
                    defaultValue={ad.notes || ""}
                    onBlur={(e) => handleNotesBlur(ad.id, e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                    style={{ width: "100%", fontSize: "12px", padding: "5px" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

            {filteredAndSortedAds.length === 0 && (
              <p style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                No properties found. Add a URL above to get started.
              </p>
            )}
          </div>
        </div>

        {/* Right: Q&A Sidebar */}
        <div
          style={{
            width: "350px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f9f9f9",
          }}
        >
          <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
        <h2>Ask Questions</h2>
        <form onSubmit={handleQuestionSubmit} style={{ marginBottom: "30px" }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your properties..."
            rows={3}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              marginBottom: "10px",
            }}
            disabled={submittingQuestion}
          />
          <button
            type="submit"
            disabled={submittingQuestion || !question.trim()}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              backgroundColor:
                submittingQuestion || !question.trim() ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                submittingQuestion || !question.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {submittingQuestion && (
              <span className="spinner" />
            )}
            {submittingQuestion ? "Thinking..." : "Ask"}
          </button>
          <style dangerouslySetInnerHTML={{
            __html: `
              .spinner {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid #fff;
                border-top-color: transparent;
                border-radius: 50%;
                animation: spinner-spin 0.6s linear infinite;
              }
              @keyframes spinner-spin {
                to { transform: rotate(360deg); }
              }
            `
          }} />
        </form>
        {questionError && (
          <div style={{ color: "red", marginBottom: "20px" }}>{questionError}</div>
        )}

        <h3>Q&A History</h3>
        {questions.length === 0 && (
          <p style={{ color: "#666" }}>No questions yet. Ask one above!</p>
        )}
        {[...questions].reverse().map((qa) => {
          const isExpanded = expandedQuestionId === qa.id;
          return (
            <div
              key={qa.id}
              style={{
                marginBottom: "10px",
                backgroundColor: "white",
                borderRadius: "4px",
                border: "1px solid #ddd",
                overflow: "hidden",
              }}
            >
              <div
                onClick={() => setExpandedQuestionId(isExpanded ? null : qa.id)}
                style={{
                  padding: "12px 15px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  backgroundColor: isExpanded ? "#f0f8ff" : "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: isExpanded ? "1px solid #ddd" : "none",
                }}
              >
                <span style={{ flex: 1 }}>Q: {qa.question}</span>
                <span style={{ fontSize: "18px", marginLeft: "10px" }}>
                  {isExpanded ? "−" : "+"}
                </span>
              </div>
              {isExpanded && (
                <div style={{ padding: "15px" }}>
                  <div style={{ color: "#333", whiteSpace: "pre-wrap", marginBottom: "10px" }}>
                    A: {qa.answer}
                  </div>
                  <div style={{ fontSize: "12px", color: "#999" }}>
                    {new Date(qa.askedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
          </div>
        </div>
      </div>

      {/* Bottom panel - Apartment Details */}
      {selectedAd && (
        <div
          style={{
            flex: "1 1 50%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#fff",
            borderTop: "2px solid #ddd",
            boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
            minHeight: 0,
          }}
        >
          <div style={{ padding: "15px", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Apartment Details</h2>
            <button
              onClick={() => setSelectedAd(null)}
              style={{
                padding: "5px 15px",
                fontSize: "14px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "30px" }}>
              {/* Left column - Basic info */}
              <div>
                <h3 style={{ marginTop: 0, borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                  Basic Information
                </h3>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Title:</strong> {selectedAd.title}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Source:</strong> {selectedAd.source}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>URL:</strong>{" "}
                  <a href={selectedAd.url} target="_blank" rel="noopener noreferrer">
                    View listing
                  </a>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Price:</strong> {selectedAd.price ? `€${selectedAd.price.toLocaleString()}` : "N/A"}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Location:</strong> {selectedAd.location}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Size:</strong> {selectedAd.size ? `${selectedAd.size}m²` : "N/A"}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Rooms:</strong> {selectedAd.rooms || "N/A"}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Bathrooms:</strong> {selectedAd.bathrooms || "N/A"}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Renovation Status:</strong> {selectedAd.renovationStatus}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Ad Age:</strong> {selectedAd.adAge}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Scraped At:</strong> {new Date(selectedAd.scrapedAt).toLocaleString()}
                </div>
              </div>

              {/* Right column - Descriptions */}
              <div>
                {/* AI Summary first */}
                {selectedAd.descriptionSummary && (
                  <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ marginTop: 0, borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                      Summary (AI-generated)
                    </h3>
                    <div style={{ whiteSpace: "pre-wrap", backgroundColor: "#f0f8ff", padding: "15px", borderRadius: "4px" }}>
                      {selectedAd.descriptionSummary}
                    </div>
                  </div>
                )}

                {/* Features */}
                {selectedAd.features && selectedAd.features.length > 0 && (
                  <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ borderBottom: "1px solid #ddd", paddingBottom: "10px", marginTop: 0 }}>
                      Features
                    </h3>
                    <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
                      {selectedAd.features.map((feature, idx) => (
                        <li key={idx} style={{ marginBottom: "5px" }}>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Full description */}
                <div>
                  <h3 style={{ marginTop: 0, borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                    Full Description
                  </h3>
                  <div style={{ whiteSpace: "pre-wrap", color: selectedAd.description ? "#000" : "#999" }}>
                    {selectedAd.description || "No description available"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
