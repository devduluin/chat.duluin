import React from "react";

type DynamicPageProps = {
  title?: string;
  content?: string;
};

const DynamicPage = ({ title, content }: DynamicPageProps) => {
  return (
    <div className="min-h-screen bg-gray-50 mt-20 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Optional Page Title */}
        {title && (
          <h2 className="text-xl font-bold mb-4 text-center">
            {title}
          </h2>
        )}

       {/* Render raw HTML content safely */}
        {content ? (
          <div
            className="text-gray-700 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-gray-700 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed fringilla, sapien vel ultricies congue, turpis lorem cursus eros.
          </p>
        )}
      </div>
    </div>
  );
};

export default DynamicPage;
