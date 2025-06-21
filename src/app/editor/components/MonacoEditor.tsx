"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { documentCrypto } from "../../../lib/crypto/encryption";
import { io, Socket } from "socket.io-client";

interface MonacoEditorProps {
  documentId: string;
  userId: string;
  language?: string;
}

export function MonacoEditor({
  documentId,
  userId,
  language = "javascript",
}: MonacoEditorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [userCount, setUserCount] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialContent] = useState("// Start typing your code here...\n\n}\n");

  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const ignoreChangesRef = useRef(false);
  const pendingChangeRef = useRef<string | null>(null);

  const isConnectedRef = useRef(isConnected);
  const encryptionKeyRef = useRef(encryptionKey);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    encryptionKeyRef.current = encryptionKey;
  }, [encryptionKey]);

  useEffect(() => {
    console.log(`🔄 MonacoEditor mounting with:`, {
      documentId,
      userId,
      language,
    });
  }, [documentId, userId, language]);

  useEffect(() => {
    async function setupEncryption() {
      try {
        console.log("🔐 Generating encryption key...");
        const key = await documentCrypto.generateKey(documentId);
        setEncryptionKey(key);
        console.log("✅ Encryption key generated successfully");
      } catch (error) {
        console.error("❌ Failed to generate encryption key:", error);
        setError("Failed to initialize encryption");
      }
    }

    setupEncryption();
  }, []);

  useEffect(() => {
    if (!encryptionKey || !documentId) {
      console.log("⏳ Waiting for encryption key and document ID...", {
        hasEncryptionKey: !!encryptionKey,
        hasDocumentId: !!documentId,
      });
      return;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    console.log(`🔌 Connecting to socket server at ${socketUrl}...`);

    const socket = io(socketUrl, {
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Socket connected with ID:", socket.id);
      setIsConnected(true);
      setIsReady(true);
      setError(null);

      socket.emit("join-room", documentId);
      console.log(`👥 Joined room: ${documentId}`);

      socket.emit("request-document", documentId);
      console.log(`📄 Requested document state for: ${documentId}`);

      if (pendingChangeRef.current) {
        console.log(
          "📤 Sending pending change now that we're connected (connect event)"
        );
        handleContentChange(pendingChangeRef.current);
        pendingChangeRef.current = null;
      }
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err);
      setError(`Connection error: ${err.message}`);
      setIsConnected(false);
      setIsReady(false);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      setIsConnected(false);
      setIsReady(false);
    });

    socket.on("user-joined", (data: { userId: string }) => {
      console.log(`👤 User joined: ${data.userId}`);
      setUserCount((prev) => prev + 1);
    });

    socket.on("user-left", (data: { userId: string }) => {
      console.log(`👋 User left: ${data.userId}`);
      setUserCount((prev) => Math.max(1, prev - 1));
    });

    socket.on("user-count", (data: { count: number }) => {
      console.log(`👥 Updated user count: ${data.count}`);
      setUserCount(data.count);
    });

    socket.on("current-document", async (data: any) => {
      try {
        if (data?.encryptedcontent && data?.iv) {
          console.log("📄 Received current document state");

          const decryptedContent = await documentCrypto.decryptDocument(
            data.encryptedcontent,
            data.iv,
            encryptionKey
          );

          ignoreChangesRef.current = true;
          if (editorRef.current) {
            editorRef.current.setValue(decryptedContent);
          }
          setTimeout(() => {
            ignoreChangesRef.current = false;
          }, 100);
        }
      } catch (error) {
        console.error("❌ Failed to decrypt document:", error);
        setError("Failed to decrypt document");
      }
    });

    socket.on("editor-change", async (data: any) => {
      try {
        if (data.userId === userId) {
          console.log("📤 Ignoring our own change");
          return;
        }

        console.log(`📥 Received change from ${data.userId}`);

        const decryptedContent = await documentCrypto.decryptDocument(
          data.encryptedcontent,
          data.iv,
          encryptionKey
        );

        ignoreChangesRef.current = true;

        if (editorRef.current) {
          const model = editorRef.current.getModel();
          model.setValue(decryptedContent);
        }

        setTimeout(() => {
          ignoreChangesRef.current = false;
        }, 100);
      } catch (error) {
        console.error("❌ Failed to decrypt content:", error);
        setError("Failed to decrypt incoming changes");
      }
    });

    return () => {
      console.log("🧹 Cleaning up socket connection");
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsReady(false);
    };
  }, [encryptionKey, documentId, userId]);

  useEffect(() => {
    if (
      isConnectedRef.current &&
      encryptionKeyRef.current &&
      pendingChangeRef.current
    ) {
      console.log("📤 Flushing pending change after ready");
      handleContentChange(pendingChangeRef.current);
      pendingChangeRef.current = null;
    }
  }, [isConnected, encryptionKey]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    console.log("🖥️ Monaco editor mounted");
    editorRef.current = editor;

    editor.onDidChangeModelContent((event) => {
      if (ignoreChangesRef.current) {
        console.log("⏩ Ignoring editor change (programmatic update)");
        return;
      }

      const newContent: string = editor.getValue();
      console.log(`✏️ Content changed, length: ${newContent.length}`);
      handleContentChange(newContent);
    });

    monaco.editor.defineTheme("myCustomTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1E1E1E",
      },
    });
    monaco.editor.setTheme("myCustomTheme");
  };

  const handleContentChange = async (newContent: string) => {
    console.log("🔄 handleContentChange called with:", {
      hasSocket: !!socketRef.current,
      isConnected: isConnectedRef.current,
      hasEncryptionKey: !!encryptionKeyRef.current,
      contentLength: newContent.length,
    });

    if (
      !socketRef.current ||
      !isConnectedRef.current ||
      !encryptionKeyRef.current
    ) {
      console.warn("⚠️ Can't send change - storing pending change");
      pendingChangeRef.current = newContent;
      return;
    }

    try {
      console.log("🔒 Encrypting content...");
      const encrypted = await documentCrypto.encryptDocument(
        newContent,
        encryptionKeyRef.current
      );

      console.log(`📤 Sending editor-change to room ${documentId}`);
      socketRef.current.emit("editor-change", {
        docID: documentId,
        encryptedcontent: encrypted.encryptedData,
        iv: encrypted.iv,
        userId: userId,
        timestamp: Date.now(),
      });

      console.log("✅ Change sent successfully");
    } catch (error) {
      console.error("❌ Failed to encrypt and send content:", error);
      setError("Failed to send changes");
    }
  };

  return (
    <div className="flex flex-col bg-gray-900 rounded-lg shadow-md overflow-hidden h-[calc(100vh-200px)] min-h-[600px]">
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${
                encryptionKey ? "bg-green-500" : "bg-yellow-500"
              }`}
            ></div>
            <span className="text-sm">
              {encryptionKey ? "Encrypted" : "Setting up encryption..."}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isReady ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm">{isReady ? "Ready" : "Not Ready"}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-100">
            {userCount} {userCount === 1 ? "user" : "users"} online
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900 text-purple-100">
            {language}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 text-white p-3">
          <p className="text-sm">⚠️ {error}</p>
        </div>
      )}

      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage={language}
          defaultValue={initialContent}
          onMount={handleEditorDidMount}
          options={{
            readOnly: !isReady,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
            lineNumbers: "on",
            tabSize: 2,
            renderLineHighlight: "all",
            formatOnPaste: true,
            formatOnType: true,
          }}
          theme="vs-dark"
          loading={
            <div className="p-4 text-white bg-gray-800 h-full flex items-center justify-center">
              Loading Editor...
            </div>
          }
        />
      </div>

      <div className="bg-gray-800 text-gray-300 border-t border-gray-700 px-4 py-1 text-xs">
        <div className="flex justify-between">
          <div>End-to-end encrypted with AES-256</div>
          <div>Document ID: {documentId}</div>
        </div>
      </div>
    </div>
  );
}
