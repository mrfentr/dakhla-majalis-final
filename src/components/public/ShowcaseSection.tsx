'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import { Thumbnails, Counter } from 'yet-another-react-lightbox/plugins';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/counter.css';

export function ShowcaseSection() {
  const [showAll, setShowAll] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const allImages = [
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1115.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0037.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0208.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0242.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0245.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0286.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0293.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0368.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0373.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1155.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1208.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1209.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1220.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1285.png?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG-20250112-WA0018.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1545.JPG?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250406_155436.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250406_173853.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250413_175007.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250413_175959.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250413_180250.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250615_165455.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250419_160842.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250610_071437.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250615_165504.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250615_170028.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250621_193001.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250621_194523.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250415_103510.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250415_110555.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250504_123351.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0430.jpeg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250502_183743.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250502_184107.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250504_171616.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250522_111217.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250522_111845.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250522_114330.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250522_120119.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG-20240614-WA0130.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/IMG-20240614-WA0131.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/4W8A1659%20v2.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20241123_171706.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20241123_173103.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250117_133307.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20240814_140213.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20240814_141300.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250117_133146.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250117_192013.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250118_180348.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250118_181617.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250119_133300.jpg?tr=w-800,f-auto,q-80',
    'https://ik.imagekit.io/fentr/dakhla%20majalis/20250119_133519.jpg?tr=w-800,f-auto,q-80'
  ];

  const displayedImages = showAll ? allImages : allImages.slice(0, 3);

  // Convert images to lightbox slides format
  const slides = allImages.map(img => ({
    src: img.replace('?tr=w-800,f-auto,q-80', '?tr=w-1920,f-auto,q-90'), // Higher quality for lightbox
    alt: 'مجلس صحراوي'
  }));

  return (
    <section id="showcase" className="py-24 bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-neutral-900 mb-3 lg:mb-4 transition-all duration-300 hover:text-[#BD7C48]">
            من أعمالنا
          </h2>
          <p className="text-lg lg:text-xl text-neutral-600">
            مجالس صحراوية أصيلة صممناها لعملائنا
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {displayedImages.map((img, i) => (
            <div
              key={i}
              className="group relative rounded-2xl overflow-hidden aspect-[4/3] border border-neutral-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer"
              onClick={() => {
                setPhotoIndex(i);
                setLightboxOpen(true);
              }}
            >
              <Image
                src={img}
                alt={`مجلس ${i + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                loading={i < 3 ? "eager" : "lazy"}
                quality={85}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Hover Zoom Indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                  <svg className="w-6 h-6 text-[#BD7C48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show More/Less Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-neutral-50 text-neutral-900 font-bold rounded-xl border-2 border-neutral-200 hover:border-[#BD7C48] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <span>{showAll ? 'عرض أقل' : 'عرض المزيد من الأعمال'}</span>
            {showAll ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={photoIndex}
        slides={slides}
        plugins={[Thumbnails, Counter]}
        on={{
          view: ({ index }) => setPhotoIndex(index)
        }}
        carousel={{
          finite: false,
        }}
        controller={{
          closeOnBackdropClick: true,
        }}
        thumbnails={{
          position: 'bottom',
          width: 100,
          height: 70,
          border: 0,
          borderRadius: 8,
          padding: 0,
          gap: 12,
          imageFit: 'cover',
        }}
        counter={{
          container: {
            style: {
              top: '20px',
              bottom: 'unset',
              left: '20px',
              right: 'unset',
              fontSize: '14px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.9)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              padding: '6px 12px',
              borderRadius: '6px',
            }
          }
        }}
        styles={{
          container: { backgroundColor: 'rgba(0, 0, 0, 0.96)' },
          thumbnail: {
            opacity: 0.6,
            filter: 'brightness(0.8)',
            transition: 'all 0.2s ease',
          },
        } as any}
      />
    </section>
  );
}
