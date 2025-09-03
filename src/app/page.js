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

  useEffect(() => {
    // Fetch default template from backend
    fetch("http://localhost:8000/template/default")
      .then(res => res.json())
      .then(data => {
        setTemplate(data.template);
        setLoading(false);
        // Render initial preview
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
    // For preview, we'll show the template as-is since we don't have specific variables
    setPreviewHtml(templateText);
  };

  const fetchTemplateDimensions = async (templateText) => {
    try {
      const formData = new FormData();
      formData.append("template", templateText);
      
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
      };
      img.src = url;
      
    } catch (error) {
      console.error("Error generating image:", error);
      setError(error.message || "Failed to generate image. Please try again.");
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

  // Update preview when template or prompt changes
  useEffect(() => {
    if (template) {
      renderPreview(template, prompt);
    }
  }, [template, prompt]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-4">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Creative Template Generator</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Creative Brief</h2>
            <form className="space-y-4">
              <label className="block font-medium">
                Describe your creative:
                <textarea
                  className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="6"
                  placeholder="Describe the banner ad you want to create. Include details about the headline, product, target audience, style, colors, and call-to-action..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </label>
              
              <button 
                type="button"
                onClick={handleGenerate}
                disabled={imageLoading}
                className="w-full bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors btn-hover"
              >
                {imageLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating...
                  </div>
                ) : (
                  "Generate Banner Image"
                )}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Template Code</h2>
            {templateDimensions && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Template Size:</strong> {templateDimensions.width} × {templateDimensions.height} pixels
                  <br />
                  <strong>Size Class:</strong> {templateDimensions.size_class}
                </div>
              </div>
            )}
            <textarea
              className="w-full p-3 border rounded-lg font-mono text-sm custom-scrollbar"
              rows="8"
              value={template}
              onChange={e => setTemplate(e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-2">
              Customize the HTML template as needed
            </p>
          </div>
        </div>

        {/* Middle Column - Preview */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Template Preview</h2>
            {templateDimensions && (
              <div className="mb-3 text-sm text-gray-600">
                Preview size: {templateDimensions.width} × {templateDimensions.height} pixels
              </div>
            )}
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {previewHtml ? (
                <div 
                  className="w-full! h-[400px] overflow-auto custom-scrollbar flex items-center justify-center"
                  style={{
                    minHeight: templateDimensions ? `${Math.min(templateDimensions.height / 2, 400)}px` : '400px',
                    minWidth: '100%'
                  }}
                >
                  <div 
                    className="border border-gray-300 bg-white"
                    style={{
                      width: templateDimensions ? `${Math.min(templateDimensions.width / 2, 400)}px` : '100%',
                      height: templateDimensions ? `${Math.min(templateDimensions.height / 2, 400)}px` : '100%'
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              ) : (
                <div className="w-full h-[400px] flex items-center justify-center text-gray-500">
                  Template preview will appear here...
                </div>
              )}
            </div>
          </div>

          {imageUrl && (
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Generated Image</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={zoomOut}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus-ring"
                    title="Zoom Out"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <button
                    onClick={resetZoom}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm focus-ring"
                    title="Reset Zoom"
                  >
                    {Math.round(imageZoom * 100)}%
                  </button>
                  <button
                    onClick={zoomIn}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus-ring"
                    title="Zoom In"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 image-container">
                <div className="overflow-auto max-h-[500px] custom-scrollbar flex items-center justify-center">
                  <img 
                    src={imageUrl} 
                    className="max-w-full max-h-full transition-transform duration-200 image-zoom-container"
                    style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center' }}
                    alt="Generated Banner" 
                  />
                </div>
              </div>

              {imageMetadata && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Dimensions:</span> {imageMetadata.width} × {imageMetadata.height}
                    </div>
                    <div>
                      <span className="font-medium">File Size:</span> {(imageMetadata.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium btn-hover"
                >
                  Download Image
                </button>
                {/* <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium btn-hover"
                >
                  {showComparison ? 'Hide' : 'Show'} Comparison
                </button> */}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Comparison or Additional Info */}
        <div className="space-y-6">
          {showComparison && imageUrl && (
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Template vs Generated</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">Template Preview</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-[200px]">
                    <div 
                      className="w-full h-full overflow-auto custom-scrollbar"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">Generated Image</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-[200px]">
                    <img 
                      src={imageUrl} 
                      className="w-full h-full object-cover"
                      alt="Generated Banner" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Tips</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Be specific about your creative vision in the prompt</li>
              <li>• Include details about style, colors, and messaging</li>
              <li>• Use the zoom controls to examine image details</li>
              <li>• Compare the template with the final generated image</li>
              <li>• Download images for use in your campaigns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
