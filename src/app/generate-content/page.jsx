"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Navbar from "../Components/Navbar";

export default function GenerateContent() {
  const [newTemplatePrompt, setNewTemplatePrompt] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("Facebook");
  const [selectedSizes, setSelectedSizes] = useState(new Set(["Square"]));
  const [availableSizes, setAvailableSizes] = useState({});
  const [templateLoading, setTemplateLoading] = useState(false);
  const [generatedTemplates, setGeneratedTemplates] = useState([]);
  const [generatedImages, setGeneratedImages] = useState({});
  const [imageGenerationLoading, setImageGenerationLoading] = useState({});
  const [error, setError] = useState("");
  const [editingTemplates, setEditingTemplates] = useState({});
  const [editPrompts, setEditPrompts] = useState({});
  const [editLoading, setEditLoading] = useState({});

  useEffect(() => {
    // Fetch available sizes
    
    axios.get("http://localhost:8000/sizes")
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
    setGeneratedImages({});

    const templates = [];
    const sizeArray = Array.from(selectedSizes);

    try {
      // Generate templates for each selected size
      for (let i = 0; i < sizeArray.length; i++) {
        const sizeName = sizeArray[i];
        
        const formData = new FormData();
        formData.append("prompt", newTemplatePrompt);
        formData.append("platform", selectedPlatform);
        formData.append("size_name", sizeName);

        const response = await axios.post("http://localhost:8000/generate-template/", formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        templates.push({
          ...response.data,
          id: `template-${i}`,
          status: 'success'
        });
      }

      setGeneratedTemplates(templates);
      
      // Automatically generate images for all templates
      for (const template of templates) {
        await generateImageForTemplate(template);
      }
      
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

    setImageGenerationLoading(prev => ({ ...prev, [template.id]: true }));

    try {
      const formData = new FormData();
      formData.append("template", template.template);
      formData.append("prompt", newTemplatePrompt);

      const response = await axios.post("http://localhost:8000/generate-image/", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });

      const blob = response.data;
      const url = URL.createObjectURL(blob);
      
      setGeneratedImages(prev => ({
        ...prev,
        [template.id]: {
          url,
          width: template.dimensions.width,
          height: template.dimensions.height,
          size: blob.size
        }
      }));

    } catch (error) {
      console.error(`Error generating image for template ${template.id}:`, error);
      const errorMessage = error.response?.data?.detail || error.message || `Failed to generate image for ${template.platform} ${template.size}`;
      setError(errorMessage);
    } finally {
      setImageGenerationLoading(prev => ({ ...prev, [template.id]: false }));
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

  const downloadTemplateImage = (templateId) => {
    const imageData = generatedImages[templateId];
    if (imageData) {
      const link = document.createElement('a');
      link.href = imageData.url;
      link.download = `template-${templateId}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
      formData.append("template", template.template);
      formData.append("prompt", editPrompt);

      const response = await axios.post("http://localhost:8000/generate-image/", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });

      const blob = response.data;
      const url = URL.createObjectURL(blob);
      
      // Update the existing template with new image
      setGeneratedImages(prev => ({
        ...prev,
        [template.id]: {
          url,
          width: template.dimensions.width,
          height: template.dimensions.height,
          size: blob.size
        }
      }));

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
                    const imageData = generatedImages[template.id];
                    const isLoading = imageGenerationLoading[template.id];
                    
                    // Calculate realistic preview size while maintaining aspect ratio
                    const maxWidth = 400;
                    const maxHeight = 300;
                    const aspectRatio = template.dimensions.width / template.dimensions.height;
                    
                    let previewWidth, previewHeight;
                    if (aspectRatio > 1) {
                      // Landscape
                      previewWidth = Math.min(maxWidth, template.dimensions.width * 0.3);
                      previewHeight = previewWidth / aspectRatio;
                    } else {
                      // Portrait or square
                      previewHeight = Math.min(maxHeight, template.dimensions.height * 0.3);
                      previewWidth = previewHeight * aspectRatio;
                    }
                    
                    return (
                      <div key={template.id} className="border border-gray-200 rounded-lg bg-white p-6">
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {template.platform} - {template.size}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {template.dimensions.width} × {template.dimensions.height} pixels
                          </p>
                        </div>
                        
                        {/* Realistic Preview Container */}
                        <div className="flex justify-center mb-4">
                          <div 
                            className="border-2 border-gray-300 rounded-lg bg-gray-50 shadow-lg overflow-hidden"
                            style={{
                              width: `${previewWidth}px`,
                              height: `${previewHeight}px`,
                              minWidth: '120px',
                              minHeight: '80px'
                            }}
                          >
                            {/* Generated Image */}
                            {imageData ? (
                              <img 
                                src={imageData.url}
                                alt={`${template.platform} ${template.size}`}
                                className="w-full h-full object-cover"
                                style={{
                                  width: '100%',
                                  height: '100%'
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                {isLoading ? (
                                  <div className="text-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-blue-600 mx-auto mb-2"></div>
                                    <div className="text-xs text-gray-600">Generating...</div>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-2">No image yet</div>
                                    <button
                                      onClick={() => generateImageForTemplate(template)}
                                      className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                                    >
                                      Generate
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Image Info and Actions */}
                        {imageData && (
                          <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>File size: {(imageData.size / 1024).toFixed(1)} KB</span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => toggleEditMode(template.id)}
                                className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors font-medium"
                              >
                                {editingTemplates[template.id] ? 'Cancel' : 'Edit'}
                              </button>
                              <button
                                onClick={() => downloadTemplateImage(template.id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors font-medium"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline Edit Section */}
                        {editingTemplates[template.id] && (
                          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-gray-900">
                                Edit Instructions
                              </label>
                              <textarea
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-black focus:ring-1 focus:ring-black transition-colors resize-none text-sm"
                                rows="3"
                                placeholder="Describe what changes you want to make to this creative..."
                                value={editPrompts[template.id] || ""}
                                onChange={e => handleEditPromptChange(template.id, e.target.value)}
                              />
                              <div className="flex justify-between items-center">
                                <div className="text-xs text-gray-500">
                                  {(editPrompts[template.id] || "").length} characters
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
                                    "Update Creative"
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
