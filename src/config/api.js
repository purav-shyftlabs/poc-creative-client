import axios from "axios";

export const base_uri = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: base_uri,
});

export const apiEndpoints = {
  // Templates
  getDefaultTemplate: () => client.get("/api/template/default"),
  getTemplateDimensions: () =>
    client.get(
      "/api/template/dimensions",
     
    ),

  // Chat/Generate
  generateInitial: (formData) =>
    client.post("/api/chat/generate-initial", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  generateWithContext: (formData) =>
    client.post("/api/chat/generate-with-context/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  generateImage: (formData) =>
    client.post("/api/chat/generate-image/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      responseType: "blob",
    }),

  // Chat history
  getChatHistory: (sessionId) => client.get(`/api/chat/history/${sessionId}`),
  clearChatHistory: (sessionId) => client.delete(`/api/chat/clear/${sessionId}`),

  // Platforms/Sizes
  getPlatformSizes: () => client.get("/api/platform/sizes"),

  // Generate Content (multi-size)
  generateContentInitial: (formData) =>
    client.post("/api/chat/generate-content/generate-initial/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default client;
