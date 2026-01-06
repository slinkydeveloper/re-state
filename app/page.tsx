"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [criteria, setCriteria] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate name
    const nameRegex = /^[a-zA-Z0-9-]+$/;
    if (!name || !nameRegex.test(name) || name.length > 50) {
      setError(
        "Research name must contain only letters, numbers, and hyphens (max 50 characters)"
      );
      return;
    }

    if (!criteria) {
      setError("Please provide search criteria");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, criteria }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create research");
      }

      // Redirect to research page
      router.push(`/research/${name}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px" }}>
      <h1>Real Estate Tracker</h1>
      <p>Create a new research project to track property listings in Italy</p>

      <form onSubmit={handleSubmit} style={{ marginTop: "30px" }}>
        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="name" style={{ display: "block", marginBottom: "5px" }}>
            Research Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., milan-apartments"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            disabled={loading}
          />
          <small style={{ color: "#666" }}>
            Only letters, numbers, and hyphens
          </small>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="criteria" style={{ display: "block", marginBottom: "5px" }}>
            Search Criteria *
          </label>
          <textarea
            id="criteria"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="e.g., 2-3 bedroom apartment in Milan, budget €300k, near metro"
            rows={4}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            disabled={loading}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "10px",
              marginBottom: "20px",
              backgroundColor: "#fee",
              border: "1px solid #fcc",
              borderRadius: "4px",
              color: "#c00",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating..." : "Create Research"}
        </button>
      </form>
    </div>
  );
}
