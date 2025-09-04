"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("Create a modern banner ad with a catchy headline, product description, and call-to-action button");
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
  const [activeTab, setActiveTab] = useState("preview");

  useEffect(() => {
    // Fetch default template from backend
    fetch("http://localhost:8000/template/default")
      .then(res => res.json())
      .then(data => {
        setTemplate(data.template);
        setLoading(false);
        renderPreview(data.template, prompt);
        
        // Get template dimensions
        fetchTemplateDimensions(data.template);
      })
      .catch(err => {
        console.error("Failed to fetch template:", err);
        setError("Failed to load template. Please refresh the page.");
        setLoading(false);
      });
  }, []);

  const renderPreview = (templateText, promptText) => {
    setPreviewHtml(templateText);
  };

  const fetchTemplateDimensions = async (templateText) => {
    try {
      const res = await fetch("http://localhost:8000/template/dimensions", {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ template: templateText })
      });
      
      if (res.ok) {
        const data = await res.json();
        setTemplateDimensions(data);
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
    formData.append("template", template);
    formData.append("prompt", prompt);
    
    try {
      const res = await fetch("http://localhost:8000/generate-image/", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      
      // Get image metadata
      const img = new Image();
      img.onload = () => {
        setImageMetadata({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: blob.size,
          type: blob.type
        });
        
        // Automatically switch to result tab when image is generated
        setActiveTab("result");
      };
      img.src = url;
      
    } catch (error) {
      console.error("Error generating image:", error);
      setError(error.message || "Failed to generate image. Please check your connection and try again.");
    } finally {
      setImageLoading(false);
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `creative-banner-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetZoom = () => setImageZoom(1);
  const zoomIn = () => setImageZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setImageZoom(prev => Math.max(prev / 1.2, 0.5));

  const resetTemplate = () => {
    fetch("http://localhost:8000/template/default")
      .then(res => res.json())
      .then(data => {
        setTemplate(data.template);
        renderPreview(data.template, prompt);
        fetchTemplateDimensions(data.template);
        setActiveTab("preview");
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
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-xl font-bold text-gray-900">
                Creative Studio
              </div>
            </div>
            <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-2 px-4 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">U</span>
              </div>
              <div className="text-sm text-gray-700 hover:text-black transition-colors">
                User
              </div>
            </div>
          </div>
        </div>
      </div>

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
            <div className="border border-gray-200 rounded-lg bg-white">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Creative Brief</h2>
                <p className="text-sm text-gray-600 mt-1">Describe your vision</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Project description
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-black focus:ring-1 focus:ring-black transition-colors resize-none text-sm"
                    rows="6"
                    placeholder="Describe your banner ad in detail..."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {prompt.length} characters
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={handleGenerate}
                  disabled={imageLoading}
                  className="bg-black cursor-pointer text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {imageLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    "Generate banner"
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

          {/* Center Panel - Preview & Results */}
          <div className="xl:col-span-9 space-y-6">
            {/* Tab Navigation */}
            <div className="border border-gray-200 rounded-lg bg-white">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === "preview" 
                      ? "text-black border-b-2 border-black" 
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === "code" 
                      ? "text-black border-b-2 border-black" 
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  Code
                </button>
                {imageUrl && (
                  <button
                    onClick={() => setActiveTab("result")}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === "result" 
                        ? "text-black border-b-2 border-black" 
                        : "text-gray-600 hover:text-black"
                    }`}
                  >
                    Result
                  </button>
                )}
              </div>

              <div className="p-6">
                {activeTab === "preview" && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-base font-medium text-gray-900">Template preview</h3>
                      {templateDimensions && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {templateDimensions.width} × {templateDimensions.height}
                        </span>
                      )}
                    </div>
                    <div className="border border-gray-200 rounded-lg bg-gray-50">
                      {previewHtml ? (
                        <div className="flex items-center justify-center p-8">
                          <div 
                            className="border border-gray-300 bg-white shadow-sm"
                            style={{
                              maxWidth: templateDimensions ? `${Math.min(templateDimensions.width / 1.2, 600)}px` : '100%',
                            }}
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                          />
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <div className="text-sm">Template preview will appear here</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "code" && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-base font-medium text-gray-900">HTML template</h3>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={resetTemplate}
                          className="text-xs text-gray-600 hover:text-black border border-gray-300 px-3 py-1 rounded transition-colors"
                        >
                          Reset
                        </button>
                        <button className="text-xs text-gray-600 hover:text-black border border-gray-300 px-3 py-1 rounded transition-colors">
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <textarea
                        className="w-full p-4 border border-gray-200 rounded-lg font-mono text-xs bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        rows="16"
                        value={template}
                        onChange={e => setTemplate(e.target.value)}
                        placeholder="HTML template will appear here..."
                      />
                    </div>
                  </div>
                )}

                {activeTab === "result" && imageUrl && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-medium text-gray-900">Generated banner</h3>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={zoomOut}
                          className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                          title="Zoom out"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <button
                          onClick={resetZoom}
                          className="px-3 py-2 text-xs text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                          title="Reset zoom"
                        >
                          {Math.round(imageZoom * 100)}%
                        </button>
                        <button
                          onClick={zoomIn}
                          className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                          title="Zoom in"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg bg-gray-50">
                      <div className="overflow-auto max-h-96 flex items-center justify-center p-6">
                        <img 
                          src={imageUrl} 
                          className="max-w-full max-h-full transition-transform duration-200 border border-gray-200"
                          style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center' }}
                          alt="Generated Banner" 
                        />
                      </div>
                    </div>

                    {imageMetadata && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">Dimensions:</span> {imageMetadata.width} × {imageMetadata.height}
                          </div>
                          <div>
                            <span className="font-medium">Size:</span> {(imageMetadata.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={handleDownload}
                        className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => setShowComparison(!showComparison)}
                        className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        {showComparison ? 'Hide comparison' : 'Compare'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showComparison && imageUrl && (
              <div className="border border-gray-200 rounded-lg bg-white">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Before & after</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Original template</h4>
                      <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                        <div 
                          className="w-full h-32 overflow-hidden flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                          style={{ transform: 'scale(0.4)', transformOrigin: 'center' }}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Generated result</h4>
                      <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                        <img 
                          src={imageUrl} 
                          className="w-full h-32 object-cover"
                          alt="Generated Banner" 
                        />
                      </div>
                    </div>
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