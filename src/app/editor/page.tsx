"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MonacoEditor } from "./components/MonacoEditor";
import { SocketDebug } from "./components/socketDebug"; // Note: capital 'D' in SocketDebug

export default function EditorPage() {
  const searchParams = useSearchParams();
  const [documentId, setDocumentId] = useState<string>("");
  const [userId] = useState(
    `user-${Math.random().toString(36).substring(2, 8)}`
  );
  const [language, setLanguage] = useState("javascript");

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "csharp", label: "C#" },
    { value: "cpp", label: "C++" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "json", label: "JSON" },
    { value: "markdown", label: "Markdown" },
  ];

  // Initialize documentId from URL param or create a new one
  useEffect(() => {
    // Check if there's a docId in the URL
    const docIdFromUrl = searchParams.get("docId");

    if (docIdFromUrl) {
      // Use the document ID from URL
      console.log(`📄 Using document ID from URL: ${docIdFromUrl}`);
      setDocumentId(docIdFromUrl);

      // Also update language if provided
      const langFromUrl = searchParams.get("lang");
      if (langFromUrl) {
        setLanguage(langFromUrl);
      }
    } else {
      // Generate a new document ID
      const newDocId = `doc-${Math.random().toString(36).substring(2, 8)}`;
      console.log(`📝 Generated new document ID: ${newDocId}`);
      setDocumentId(newDocId);

      // Update the URL with the new document ID
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("docId", newDocId);
      newUrl.searchParams.set("lang", language);
      window.history.replaceState({}, "", newUrl.toString());
    }
    // We intentionally do not include 'language' in deps to avoid unnecessary effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update language and URL when language changes
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);

    // Update URL with new language
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("lang", newLanguage);
    window.history.replaceState({}, "", newUrl.toString());
  };

  // Share URL functionality
  const shareDocument = () => {
    // Make sure URL contains the current document ID and language
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("docId", documentId);
    currentUrl.searchParams.set("lang", language);
    const shareUrl = currentUrl.toString();

    // Use clipboard API to copy the URL
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        alert(
          "Document URL copied to clipboard! Share this URL with collaborators."
        );
      })
      .catch((err) => {
        console.error("Failed to copy URL:", err);
        // Fallback
        prompt("Share this URL with collaborators:", shareUrl);
      });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h1 className="text-xl font-semibold flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Secure Collaborative Code Editor
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-gray-700 text-white text-sm rounded-md px-3 py-1.5 border border-gray-600"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>

            <button
              onClick={shareDocument}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-md flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Add the SocketDebug component here */}
        <SocketDebug />
        {documentId && (
          <MonacoEditor
            documentId={documentId}
            userId={userId}
            language={language}
          />
        )}
      </main>

      <footer className="bg-gray-800 text-gray-400 text-center py-4 text-sm">
        <div className="max-w-7xl mx-auto">
          All content is end-to-end encrypted. Your code remains private.
          {documentId && <div className="mt-1">Document ID: {documentId}</div>}
        </div>
      </footer>
    </div>
  );
}
