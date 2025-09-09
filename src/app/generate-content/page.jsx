"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../Components/Navbar";
import { apiEndpoints } from "../../config/api";

export default function GenerateContent() {
  const [newTemplatePrompt, setNewTemplatePrompt] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("Facebook");
  const [selectedSizes, setSelectedSizes] = useState(new Set(["Square"]));
  const [availableSizes, setAvailableSizes] = useState({});
  const [templateLoading, setTemplateLoading] = useState(false);
  const [generatedTemplates, setGeneratedTemplates] = useState([]);
  const [error, setError] = useState("");
  const [editingTemplates, setEditingTemplates] = useState({});
  const [editPrompts, setEditPrompts] = useState({});
  const [editLoading, setEditLoading] = useState({});
  const [sessionId, setSessionId] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState({});
  
  // Generate a preview image URL for a given HTML template
  const generatePreviewForTemplate = async ({ id, template, platform, size }) => {
    if (!template) return;
    // Mark loading
    setGeneratedTemplates(prev => prev.map(t => 
      t.id === id ? { ...t, previewLoading: true } : t
    ));
    try {
      const formData = new FormData();
      formData.append("template", template);
      formData.append("prompt", "Generate image preview");
      const response = await apiEndpoints.generateImage(formData);
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      setGeneratedTemplates(prev => prev.map(t => 
        t.id === id ? { ...t, previewUrl: url, previewLoading: false } : t
      ));
    } catch (error) {
      console.error(`Error generating preview image for template ${id}:`, error);
      setGeneratedTemplates(prev => prev.map(t => 
        t.id === id ? { ...t, previewUrl: null, previewLoading: false } : t
      ));
      setError("Failed to generate preview image. You can still download the image.");
    }
  };

  useEffect(() => {
    // Generate a unique session ID for chat context
    let currentSessionId = localStorage.getItem('generate_content_session_id');
    if (!currentSessionId) {
      currentSessionId = `generate_content_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('generate_content_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);
    
    // Fetch available sizes
    apiEndpoints.getPlatformSizes()
      .then(response => {
        setAvailableSizes(response.data.sizes);
        // Set default size based on selected platform
        if (response.data.sizes[selectedPlatform]) {
          setSelectedSizes(new Set([response.data.sizes[selectedPlatform][0].name]));
        }
      })
      .catch(err => {
        console.error("Failed to fetch sizes:", err);
      });
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadChatHistory();
    }
  }, [sessionId]);

  const loadChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      const response = await apiEndpoints.getChatHistory(sessionId);
      const history = response.data.history || [];
      setChatHistory(history);
      console.log(`Loaded ${history.length} chat history entries for generate-content session: ${sessionId}`);
    } catch (error) {
      console.error("Error loading chat history:", error);
      setChatHistory([]);
    }
  };

  const clearChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      await apiEndpoints.clearChatHistory(sessionId);
      setChatHistory([]);
      
      // Clear the session ID from localStorage to start fresh
      localStorage.removeItem('generate_content_session_id');
      
      // Generate a new session ID
      const newSessionId = `generate_content_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('generate_content_session_id', newSessionId);
      setSessionId(newSessionId);
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!newTemplatePrompt.trim()) {
      setError("Please enter a creative brief");
      return;
    }

    if (selectedSizes.size === 0) {
      setError("Please select at least one size");
      return;
    }

    setTemplateLoading(true);
    setError("");
    setGeneratedTemplates([]);

    const templates = [];
    const sizeArray = Array.from(selectedSizes);

    try {
      // Generate templates for each selected size using chat context
      for (let i = 0; i < sizeArray.length; i++) {
        const sizeName = sizeArray[i];
        
        const formData = new FormData();
        formData.append("session_id", sessionId);
        formData.append("prompt", newTemplatePrompt);
        formData.append("platform", selectedPlatform);
        formData.append("size_name", sizeName);
        // Include full chat history for complete context
        try {
          formData.append(
            "chat_history",
            JSON.stringify(
              (chatHistory || []).map((entry) => ({
                user_message: entry.user_message,
                ai_response: entry.ai_response,
                created_at: entry.created_at,
              }))
            )
          );
        } catch (_) {
          // no-op if serialization fails
        }

        const response = await apiEndpoints.generateContentInitial(formData);

        templates.push({
          ...response.data,
          id: `template-${Date.now()}-${i}`, // More unique ID for better tracking
          status: 'success',
          previewUrl: null,
          previewLoading: true,
        });
      }

      setGeneratedTemplates(templates);
      // Generate preview images for each template (non-blocking)
      templates.forEach((t) => {
        generatePreviewForTemplate({
          id: t.id,
          template: t.template,
          platform: t.platform,
          size: t.size,
        });
      });
      
      // Update local chat history
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        user_message: newTemplatePrompt,
        ai_response: "Templates generated successfully",
        created_at: new Date().toISOString()
      }]);
      
      // Clear the form
      setNewTemplatePrompt("");
      
    } catch (error) {
      console.error("Error generating templates:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to generate templates. Please try again.";
      setError(errorMessage);
    } finally {
      setTemplateLoading(false);
    }
  };

  const generateImageForTemplate = async (template) => {
    if (!template) return;

    try {
      const formData = new FormData();
      formData.append("template", template.template);
      formData.append("prompt", "Generate image for download");

      const response = await apiEndpoints.generateImage(formData);

      const blob = response.data;
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `creative-banner-${template.platform}-${template.size}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error(`Error generating image for template ${template.id}:`, error);
      const errorMessage = error.response?.data?.detail || error.message || `Failed to generate image for ${template.platform} ${template.size}`;
      setError(errorMessage);
    }
  };

  const handlePlatformChange = (platform) => {
    setSelectedPlatform(platform);
    // Set the first available size for the new platform
    if (availableSizes[platform] && availableSizes[platform].length > 0) {
      setSelectedSizes(new Set([availableSizes[platform][0].name]));
    }
  };

  const handleSizeToggle = (sizeName) => {
    const newSelectedSizes = new Set(selectedSizes);
    if (newSelectedSizes.has(sizeName)) {
      newSelectedSizes.delete(sizeName);
    } else {
      newSelectedSizes.add(sizeName);
    }
    setSelectedSizes(newSelectedSizes);
  };


  const toggleEditMode = (templateId) => {
    setEditingTemplates(prev => ({
      ...prev,
      [templateId]: !prev[templateId]
    }));
    
    // Clear edit prompt when opening edit mode
    if (!editingTemplates[templateId]) {
      setEditPrompts(prev => ({
        ...prev,
        [templateId]: ""
      }));
    }
  };

  const handleEditPromptChange = (templateId, value) => {
    setEditPrompts(prev => ({
      ...prev,
      [templateId]: value
    }));
  };

  const handleSaveEdit = async (template) => {
    const editPrompt = editPrompts[template.id];
    if (!editPrompt.trim()) return;

    setEditLoading(prev => ({ ...prev, [template.id]: true }));
    setError("");

    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("template", template.template); // Always include the latest HTML template
      formData.append("prompt", editPrompt);
      // Note: template_id is optional and expects an integer, so we omit it
      // Include full chat history for complete context
      try {
        formData.append(
          "chat_history",
          JSON.stringify(
            (chatHistory || []).map((entry) => ({
              user_message: entry.user_message,
              ai_response: entry.ai_response,
              created_at: entry.created_at,
            }))
          )
        );
      } catch (_) {
        // no-op if serialization fails
      }

      const response = await apiEndpoints.generateWithContext(formData);

      const newTemplate = response.data.template;
      
      // Update the existing template with new HTML
      setGeneratedTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, template: newTemplate, previewLoading: true }
          : t
      ));

      // Regenerate preview image for this template
      generatePreviewForTemplate({
        id: template.id,
        template: newTemplate,
        platform: template.platform,
        size: template.size,
      });

      // Update local chat history (backend automatically saves HTML template to chat context)
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        user_message: editPrompt,
        ai_response: "Template updated successfully",
        created_at: new Date().toISOString()
      }]);

      // Close edit mode and clear prompt
      setEditingTemplates(prev => ({
        ...prev,
        [template.id]: false
      }));
      setEditPrompts(prev => ({
        ...prev,
        [template.id]: ""
      }));
      
    } catch (error) {
      console.error("Error editing template:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to edit template";
      setError(`Failed to edit template: ${errorMessage}`);
    } finally {
      setEditLoading(prev => ({ ...prev, [template.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
        <Navbar />

      <div className="max-w-7xl mx-auto p-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Template Generation Form */}
          <div className="lg:col-span-1">
            <div className="border border-gray-200 rounded-lg bg-white sticky top-24">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Generate New Template</h2>
                <p className="text-sm text-gray-600 mt-1">Create templates from scratch using AI</p>
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

                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Platform
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.keys(availableSizes).map((platform) => (
                      <button
                        key={platform}
                        onClick={() => handlePlatformChange(platform)}
                        className={`p-3 border rounded-lg text-sm font-medium transition-colors text-left ${
                          selectedPlatform === platform
                            ? "border-black bg-black text-white"
                            : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Sizes (Select multiple)
                  </label>
                  <div className="space-y-2">
                    {availableSizes[selectedPlatform]?.map((size) => (
                      <button
                        key={size.name}
                        onClick={() => handleSizeToggle(size.name)}
                        className={`w-full p-3 border rounded-lg text-sm font-medium transition-colors text-left ${
                          selectedSizes.has(size.name)
                            ? "border-black bg-black text-white"
                            : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{size.name}</span>
                          <span className="text-xs opacity-75">{size.width} × {size.height}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Selected: {selectedSizes.size} size{selectedSizes.size !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Creative Brief */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Creative Brief
                  </label>
                  <textarea
                    className="w-full p-4 border border-gray-300 rounded-lg focus:border-black focus:ring-1 focus:ring-black transition-colors resize-none text-sm"
                    rows="8"
                    placeholder="Describe your creative vision in detail. Include elements like: colors, style, messaging, target audience, mood, and any specific requirements..."
                    value={newTemplatePrompt}
                    onChange={e => setNewTemplatePrompt(e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-2">
                    {newTemplatePrompt.length} characters
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateTemplate}
                  disabled={templateLoading || !newTemplatePrompt.trim() || selectedSizes.size === 0}
                  className="w-full bg-black text-white px-6 py-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {templateLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Generating {selectedSizes.size} template{selectedSizes.size !== 1 ? 's' : ''}...
                    </div>
                  ) : (
                    `Generate ${selectedSizes.size} Template${selectedSizes.size !== 1 ? 's' : ''}`
                  )}
                </button>

                {/* Info Box */}
              
              </div>
            </div>
          </div>

          {/* Right Panel - Generated Images */}
          <div className="lg:col-span-2">
            {generatedTemplates.length > 0 ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Generated Creatives</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {generatedTemplates.length} creative{generatedTemplates.length !== 1 ? 's' : ''} generated
                  </p>
                </div>
                
                <div className="space-y-8">
                  {generatedTemplates.map((template) => {
                    const currentTab = activeTab[template.id] || 'preview';
                    
                    return (
                      <div key={template.id} className="border border-gray-200 rounded-lg bg-white">
                        <div className="p-6 border-b border-gray-200">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {template.platform} - {template.size}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {template.dimensions.width} × {template.dimensions.height} pixels
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => toggleEditMode(template.id)}
                                className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors font-medium"
                              >
                                {editingTemplates[template.id] ? 'Cancel' : 'Edit'}
                              </button>
                              <button
                                onClick={() => generateImageForTemplate(template)}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors font-medium"
                              >
                                Download Image
                              </button>
                            </div>
                          </div>
                          
                          {/* Tab Navigation */}
                          <div className="flex border-b border-gray-200">
                            <button
                              onClick={() => setActiveTab(prev => ({ ...prev, [template.id]: 'preview' }))}
                              className={`px-4 py-2 text-sm font-medium transition-colors ${
                                currentTab === 'preview' 
                                  ? "text-black border-b-2 border-black" 
                                  : "text-gray-600 hover:text-black"
                              }`}
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => setActiveTab(prev => ({ ...prev, [template.id]: 'code' }))}
                              className={`px-4 py-2 text-sm font-medium transition-colors ${
                                currentTab === 'code' 
                                  ? "text-black border-b-2 border-black" 
                                  : "text-gray-600 hover:text-black"
                              }`}
                            >
                              HTML Code
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-6">
                          {/* Preview Tab */}
                          {currentTab === 'preview' && (
                            <div className="w-full">
                              <div className="flex justify-center mb-4">
                                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                  Preview: {template.dimensions.width} × {template.dimensions.height}px
                                </div>
                              </div>
                              <div className="flex justify-center items-center min-h-[500px] bg-gray-50 rounded-lg p-8">
                                <div 
                                  className="shadow-2xl rounded-lg max-w-[1200px] max-h-[800px] border-2 border-gray-200 flex items-center justify-center"
                                  style={{
                                    width: `${Math.min(1200, template.dimensions.width)}px`,
                                    height: `${Math.min(800, template.dimensions.height)}px`,
                                    minWidth: '400px',
                                    minHeight: '300px',
                                    maxWidth: '95vw',
                                    maxHeight: '80vh',
                                  }}
                                >
                                  {template.previewLoading ? (
                                    <div className="flex items-center text-sm text-gray-600">
                                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent mr-3"></div>
                                      Generating preview image...
                                    </div>
                                  ) : template.previewUrl ? (
                                    <img 
                                      src={template.previewUrl} 
                                      alt={`${template.platform} ${template.size} preview`} 
                                      className="object-contain w-full h-full"
                                    />
                                  ) : (
                                    <div className="text-sm text-gray-500">Preview unavailable. Try downloading the image.</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-center mt-4">
                                <p className="text-xs text-gray-500">Image preview shown. Use Download for a PNG file.</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Code Tab */}
                          {currentTab === 'code' && (
                            <div>
                              <div className="mb-4 flex justify-between items-center">
                                <h5 className="text-sm font-medium text-gray-900">HTML Template</h5>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(template.template)}
                                  className="text-xs text-gray-600 hover:text-black border border-gray-300 px-3 py-1 rounded transition-colors"
                                >
                                  Copy
                                </button>
                              </div>
                              <textarea
                                className="w-full p-4 border border-gray-200 rounded-lg font-mono text-xs bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-colors"
                                rows="20"
                                value={template.template}
                                readOnly
                                placeholder="HTML template will appear here..."
                              />
                            </div>
                          )}
                        </div>

                        {/* Inline Edit Section */}
                        {editingTemplates[template.id] && (
                          <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-gray-900">
                                Edit Instructions
                              </label>
                              <textarea
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-black focus:ring-1 focus:ring-black transition-colors resize-none text-sm"
                                rows="3"
                                placeholder="Describe what changes you want to make to this template..."
                                value={editPrompts[template.id] || ""}
                                onChange={e => handleEditPromptChange(template.id, e.target.value)}
                              />
                              <div className="flex justify-between items-center">
                                <div className="text-xs text-gray-500">
                                  {(editPrompts[template.id] || "").length} characters
                                  <span className="ml-2 text-blue-600">💡 AI has access to the current HTML template and chat history</span>
                                </div>
                                <button
                                  onClick={() => handleSaveEdit(template)}
                                  disabled={editLoading[template.id] || !editPrompts[template.id]?.trim()}
                                  className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                  {editLoading[template.id] ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                      Updating...
                                    </div>
                                  ) : (
                                    "Apply Changes"
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No creatives generated yet</h3>
                <p className="text-gray-500 mb-6">Fill out the form on the left to generate your first creative</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
