"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./Components/Navbar";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageZoom, setImageZoom] = useState(1);
  const [showComparison, setShowComparison] = useState(false);
  const [imageMetadata, setImageMetadata] = useState(null);
  const [templateDimensions, setTemplateDimensions] = useState(null);
  const [activeTab, setActiveTab] = useState("result");
  const [sessionId, setSessionId] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  

  useEffect(() => {
    // Get or create a persistent session ID
    let currentSessionId = localStorage.getItem('creative_session_id');
    if (!currentSessionId) {
      currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('creative_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);
    
    // Check for template parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const templateParam = urlParams.get('template');
    const dimensionsParam = urlParams.get('dimensions');

    if (templateParam && dimensionsParam) {
      try {
        const template = decodeURIComponent(templateParam);
        const dimensions = JSON.parse(decodeURIComponent(dimensionsParam));
        
        setTemplate(template);
        setTemplateDimensions(dimensions);
        setLoading(false);
        renderPreview(template, prompt);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("Failed to parse template parameters:", err);
        // Fall back to default template
        loadDefaultTemplate();
      }
    } else {
      loadDefaultTemplate();
    }
  }, []);

  const loadDefaultTemplate = () => {
    // Fetch default template from backend
    axios.get("http://localhost:8000/api/template/default")
      .then(response => {
        setTemplate(response.data.template.html);
        setLoading(false);
        renderPreview(response.data.template.html, prompt);
        ``
        // Get template dimensions
        fetchTemplateDimensions(response.data.template.html);
      })
      .catch(err => {
        console.error("Failed to fetch template:", err);
        setError("Failed to load template. Please refresh the page.");
        setLoading(false);
      });
  };

  const renderPreview = (templateText, promptText) => {
    setPreviewHtml(templateText);
  };

  const fetchTemplateDimensions = async (templateText) => {
    try {
      const response = await axios.get("http://localhost:8000/api/template/dimensions", {
      }, {
        headers: {
          "Content-Type": "application/json",
        }
      });
      console.log(response.data);
      if (response.status === 200) {
        setTemplateDimensions(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch template dimensions:", err);
    }
  };

  const handleGenerate = async () => {
    setImageLoading(true);
    setError("");
    setImageUrl("");
    setImageMetadata(null);
  
    const formData = new FormData();
  
    formData.append("session_id", sessionId);
    formData.append("prompt", prompt);
    formData.append("platform", "Facebook"); // Make sure this is included
    formData.append("size_name", "Square");
    formData.append("template", template);
  
    // Match the curl structure
    const sizeConfig = {
      name: "Square",
      width: templateDimensions.width,
      height: templateDimensions.height
    };
  
    formData.append("size_config", JSON.stringify(sizeConfig)); // <-- this is correct
  
    try {
      const response = await axios.post("http://localhost:8000/api/chat/generate-initial", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      const newTemplate = response.data.template;
      setTemplate(newTemplate);
      renderPreview(newTemplate, prompt);
  
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        user_message: prompt,
        ai_response: "Initial template generated successfully",
        created_at: new Date().toISOString()
      }]);
  
      console.log(`Initial template generated for session: ${sessionId}`);
    } catch (error) {
      console.error("Error generating template:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to generate template. Please check your connection and try again.";
      setError(errorMessage);``
    } finally {
      setImageLoading(false);
    }
  };
  


  const handleDownload = async () => {
    if (!template) {
      setError("No template available to download");
      return;
    }
    
    setImageLoading(true);
    setError("");
    
    console.log("Converting HTML template to image using Playwright...");
    
    const formData = new FormData();
    formData.append("template", template);
    formData.append("prompt", "Generate image for download");
    
    try {
      const response = await axios.post("http://localhost:8000/api/chat/generate-image/", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });
      
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      
      console.log("Image generated successfully, starting download...");
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `creative-banner-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error generating image for download:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to generate image for download. Please try again.";
      setError(errorMessage);
    } finally {
      setImageLoading(false);
    }
  };

  const resetZoom = () => setImageZoom(1);
  const zoomIn = () => setImageZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setImageZoom(prev => Math.max(prev / 1.2, 0.5));

  const handleEditWithContext = async () => {
    if (!prompt.trim() || !sessionId) return;
    
    setEditLoading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("template", template);
    formData.append("prompt", prompt);
    
    try {
      const response = await axios.post("http://localhost:8000/api/chat/generate-with-context/", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const newTemplate = response.data.template;
      setTemplate(newTemplate);
      renderPreview(newTemplate, prompt);
      
      // Clear the generated image so it shows the updated template preview
      setImageUrl("");
      setImageMetadata(null);
      
      // The chat history is already saved to database by the backend endpoint
      // Just update local state to reflect the new entry
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        user_message: prompt,
        ai_response: "Template updated successfully",
        created_at: new Date().toISOString()
      }]);
      
      console.log(`Template updated with context for session: ${sessionId}`);
      
      // Clear the prompt
      setPrompt("");
      
    } catch (error) {
      console.error("Error editing with context:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to edit template. Please try again.";
      setError(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  const loadChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`http://localhost:8000/api/chat/history/${sessionId}`);
      const history = response.data.history || [];
      setChatHistory(history);
      console.log(`Loaded ${history.length} chat history entries for session: ${sessionId}`);
    } catch (error) {
      console.error("Error loading chat history:", error);
      // If there's an error loading history, start with empty array
      setChatHistory([]);
    }
  };

  const clearChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      await axios.delete(`http://localhost:8000/api/chat/clear/${sessionId}`);
      setChatHistory([]);
      
      // Clear the session ID from localStorage to start fresh
      localStorage.removeItem('creative_session_id');
      
      // Generate a new session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('creative_session_id', newSessionId);
      setSessionId(newSessionId);
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

  const resetTemplate = () => {
    axios.get("http://localhost:8000/template/default")
      .then(response => {
        setTemplate(response.data.template);
        renderPreview(response.data.template, prompt);
        fetchTemplateDimensions(response.data.template);
      })
      .catch(err => {
        console.error("Failed to reset template:", err);
        setError("Failed to reset template. Please refresh the page.");
      });
  };

  useEffect(() => {
    if (template) {
      renderPreview(template, prompt);
    }
  }, [template, prompt]);

  useEffect(() => {
    if (sessionId) {
      loadChatHistory();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="mt-4 text-sm text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Navbar />
  

      <div className="max-w-7xl mx-auto p-6 gap-y-6">
        {error && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="text-red-600 mt-0.5">⚠</div>
              <div className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        
        <div className="space-y-6">
          {/* Left Panel - Creative Brief */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Update Pre-Generated Template</h2>
              <p className="text-sm text-gray-600 mt-1">Modify the template to fit your needs</p>
            </div>
            <div className="border border-gray-200 rounded-lg bg-white">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Creative Brief</h2>
                <p className="text-sm text-gray-600 mt-1">Describe your vision</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Chat History */}
                {chatHistory.length > 0 && (
                  <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Conversation History</h4>
                      <button 
                        onClick={clearChatHistory}
                        className="text-xs text-gray-600 hover:text-red-600 border border-gray-300 px-2 py-1 rounded transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                      {chatHistory.map((chat, index) => (
                        <div key={index} className="text-xs">
                          <div className="text-gray-600">
                            <strong>You:</strong> {chat.user_message}
                          </div>
                          <div className="text-gray-500 ml-2">
                            <strong>AI:</strong> {chat.ai_response}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Project description
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-black focus:ring-1 focus:ring-black transition-colors resize-none text-sm"
                    rows="6"
                    placeholder={imageUrl ? "Describe your changes to the banner..." : "Describe your banner ad in detail..."}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {prompt.length} characters
                    {imageUrl && (
                      <span className="ml-2 text-blue-600">💡 AI will remember your previous requests</span>
                    )}
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={imageUrl ? handleEditWithContext : handleGenerate}
                  disabled={imageLoading || editLoading || !prompt.trim()}
                  className="bg-black cursor-pointer text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {(imageLoading || editLoading) ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {imageUrl ? "Editing..." : "Generating..."}
                    </div>
                  ) : (
                    imageUrl ? "Apply Changes" : "Generate banner"
                  )}
                </button>

                {templateDimensions && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Template specs</h3>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>{templateDimensions.width} × {templateDimensions.height} px</div>
                      <div className="text-gray-600">{templateDimensions.size_class}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

           
          </div>

          {/* Center Panel - Results */}
          <div className="xl:col-span-9 space-y-6">
            <div className="border border-gray-200 rounded-lg bg-white">

              <div className="p-6">
                {/* Result View */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-medium text-gray-900">
                      {chatHistory.length > 0 ? "Generated Template" : "Template preview"}
                    </h3>
                    {chatHistory.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          Ready for download
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg bg-gray-50">
                    <div className="overflow-auto max-h-96 flex items-center justify-center p-6">
                      <div 
                        className="border border-gray-300 bg-white shadow-sm"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </div>
                  </div>

                  {templateDimensions && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                        <div>
                          <span className="font-medium">Dimensions:</span> {templateDimensions.width} × {templateDimensions.height}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {chatHistory.length > 0 ? "Generated" : "Default"}
                        </div>
                      </div>
                    </div>
                  )}

                  {chatHistory.length > 0 && (
                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={handleDownload}
                        disabled={imageLoading}
                        className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {imageLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Generating...
                          </div>
                        ) : (
                          "Download Image"
                        )}
                      </button>
                      <button
                        onClick={() => setShowComparison(!showComparison)}
                        className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        {showComparison ? 'Hide comparison' : 'Compare'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {showComparison && chatHistory.length > 0 && (
              <div className="border border-gray-200 rounded-lg bg-white">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Template Evolution</h3>
                </div>
                <div className="p-6">
                  <div className="text-sm text-gray-600 mb-4">
                    This shows how your template has evolved through your edits. Click "Download Image" to generate the final image.
                  </div>
                  <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                    <div 
                      className="w-full h-32 overflow-hidden flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                      style={{ transform: 'scale(0.4)', transformOrigin: 'center' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}