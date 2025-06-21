const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const SOCKET_PORT = process.env.SOCKET_PORT || 3001;
// Track users per document
const documentUsers = new Map(); // docID -> Set of userIDs
const documentContent = new Map(); // docID -> { encryptedcontent, iv }

// Debug function to log all active rooms
function logRooms(io) {
  console.log("\n📊 Current Active Rooms:");
  for (const [docId, users] of documentUsers.entries()) {
    console.log(`- Room ${docId}: ${users.size} users`);
  }
  console.log("");
}

nextApp.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      handle(req, res);
    } catch (err) {
      console.error("Error handling HTTP request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🟢 New client connected: ${socket.id}`);

    let currentDocID = null;

    // Log all events for debugging
    socket.onAny((event, ...args) => {
      if (event !== "ping") {
        // Ignore ping events
        console.log(`📥 [${socket.id}] Event: ${event}`, args);
      }
    });

    // Handle room joining
    socket.on("join-room", (docID) => {
      // Make sure docID is a string
      docID = String(docID);

      currentDocID = docID;
      socket.join(docID);
      console.log(`Socket ${socket.id} joined room: ${docID}`);

      // Track user in this document
      if (!documentUsers.has(docID)) {
        documentUsers.set(docID, new Set());
      }
      documentUsers.get(docID).add(socket.id);

      // Send current document state to the new user if available
      const currentContent = documentContent.get(docID);
      if (currentContent) {
        socket.emit("current-document", currentContent);
        console.log(`📄 Sent current document state to new user ${socket.id}`);
      }

      // Notify others in the room about the new user
      socket.to(docID).emit("user-joined", {
        userId: socket.id,
      });

      // Broadcast updated user count to all users in the room
      const userCount = documentUsers.get(docID).size;
      io.to(docID).emit("user-count", { count: userCount });
      console.log(`👥 Room ${docID} now has ${userCount} users`);

      // Log all active rooms
      logRooms(io);
    });

    socket.on("editor-change", (data) => {
      if (!data) {
        console.error("❌ Received null data in editor-change event");
        return;
      }

      const { docID, encryptedcontent, iv, userId, timestamp } = data;

      // Validate required fields
      if (!docID || !encryptedcontent || !iv) {
        console.error("❌ Invalid editor-change data received:", {
          hasDocID: !!docID,
          hasContent: !!encryptedcontent,
          hasIV: !!iv,
        });
        return;
      }

      console.log(
        `📄 Encrypted editor change in "${docID}" from user: ${
          userId || socket.id
        }, content length: ${encryptedcontent.length}`
      );

      // Store the latest content
      documentContent.set(docID, {
        encryptedcontent,
        iv,
        timestamp: timestamp || Date.now(),
      });

      // Emit to all others in the room
      console.log(`📤 Broadcasting to room: ${docID}`);
      socket.to(docID).emit("editor-change", {
        encryptedcontent,
        iv,
        userId: userId || socket.id,
        timestamp: timestamp || Date.now(),
      });
    });

    // Request for current document content
    socket.on("request-document", (docID) => {
      // Make sure docID is a string
      docID = String(docID);

      const currentContent = documentContent.get(docID);
      if (currentContent) {
        socket.emit("current-document", currentContent);
        console.log(`📄 Sent document on request to ${socket.id}`);
      } else {
        console.log(`ℹ️ No content available for document ${docID}`);
      }
    });

    // Ping to keep connection alive
    socket.on("ping", () => {
      // No need to do anything, just keep the connection alive
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`🔴 Client disconnected: ${socket.id}`);

      if (currentDocID) {
        // Remove user from tracking
        const users = documentUsers.get(currentDocID);
        if (users) {
          users.delete(socket.id);

          // Notify others about user leaving
          socket.to(currentDocID).emit("user-left", {
            userId: socket.id,
          });

          // Broadcast updated user count
          const userCount = users.size;
          io.to(currentDocID).emit("user-count", { count: userCount });
          console.log(`👥 Room ${currentDocID} now has ${userCount} users`);

          // Clean up if room is empty
          if (userCount === 0) {
            documentUsers.delete(currentDocID);
            // We're keeping document content for when users rejoin
            // documentContent.delete(currentDocID);
            console.log(`🧹 Cleaned up empty room: ${currentDocID}`);
          }

          // Log all active rooms
          logRooms(io);
        }
      }
    });
  });

  httpServer.listen(SOCKET_PORT, () => {
    console.log(`✅ Socket.IO server running on port ${SOCKET_PORT}`);
    console.log(
      `📱 Next.js app likely on http://localhost:${process.env.PORT || 3000}`
    );
  });
});
