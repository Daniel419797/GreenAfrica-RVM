'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Define the marker location
const MARKER_POSITION: [number, number] = [6.433402, 3.541907];

// Create custom icon using the SVG
const createCustomIcon = () => {
  const svgString = `
    <svg preserveAspectRatio="none" width="40" height="40" overflow="visible" style="display: block;" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="ShippingContainer" transform="rotate(92.651 20 20)">
        <path id="Vector" d="M36.9375 11.0391L20.3437 6.29844C20.1748 6.25001 19.9975 6.23776 19.8234 6.2625L3.39687 8.60937C2.80212 8.69685 2.25843 8.99468 1.86452 9.4488C1.47061 9.90292 1.25257 10.4832 1.25 11.0844V28.9156C1.25257 29.5168 1.47061 30.0971 1.86452 30.5512C2.25843 31.0053 2.80212 31.3031 3.39687 31.3906L19.8234 33.7344C19.8819 33.7435 19.9409 33.7487 20 33.75C20.1163 33.7502 20.232 33.7339 20.3437 33.7016L36.9375 28.9609C37.4579 28.8102 37.9157 28.4952 38.2424 28.0629C38.569 27.6307 38.7471 27.1043 38.75 26.5625V13.4375C38.7471 12.8957 38.569 12.3693 38.2424 11.9371C37.9157 11.5048 37.4579 11.1898 36.9375 11.0391ZM10 18.75H7.5C7.16848 18.75 6.85054 18.8817 6.61612 19.1161C6.3817 19.3505 6.25 19.6685 6.25 20C6.25 20.3315 6.3817 20.6495 6.61612 20.8839C6.85054 21.1183 7.16848 21.25 7.5 21.25H10V29.8094L3.75 28.9156V11.0844L10 10.1906V18.75ZM18.75 31.0594L12.5 30.1656V21.25H15C15.3315 21.25 15.6495 21.1183 15.8839 20.8839C16.1183 20.6495 16.25 20.3315 16.25 20C16.25 19.6685 16.1183 19.3505 15.8839 19.1161C15.6495 18.8817 15.3315 18.75 15 18.75H12.5V9.83438L18.75 8.94063V31.0594Z" fill="#2E7D33"/>
      </g>
    </svg>
  `;

  return L.divIcon({
    html: svgString,
    className: 'custom-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

interface InteractiveMapProps {
  className?: string;
}

export default function InteractiveMap({ className = "" }: InteractiveMapProps) {
  const customIcon = createCustomIcon();

  // Fix for default markers not showing in Next.js
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className={`w-full h-full ${className}`}>
      <MapContainer
        center={MARKER_POSITION}
        zoom={15}
        style={{ width: '100%', height: '100%' }}
        className="rounded-2xl overflow-hidden"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={MARKER_POSITION} icon={customIcon}>
          <Popup>
            <div className="">
              <div className="content-stretch flex flex-col gap-[13px] items-start relative shrink-0 w-full">
                {/* Location name */}
                <div className="content-stretch flex gap-[14px] h-[18px] items-center relative shrink-0 w-full">
                  <div className="basis-0 content-stretch flex gap-[5px] grow items-center min-h-px min-w-px relative shrink-0">
                    <div className="relative shrink-0 size-[18px]">
                      <img alt="" className="block max-w-none size-full" src="/49e5ae5dd47efa0013ef5ca724093a5165601bbd.svg" />
                    </div>
                    <p className="font-normal leading-none relative shrink-0 text-[#696565] text-[13px] text-center text-nowrap whitespace-pre">
                      Location name
                    </p>
                  </div>
                  <p className="font-medium leading-none relative shrink-0 text-[#1e1e1e] text-[16px] text-nowrap whitespace-pre">
                    iFitness Orchid
                  </p>
                </div>

                {/* Base Sepolia ledger: do not display a legacy Hedera address. */}
                <div className="content-stretch flex gap-px h-[18px] items-center relative shrink-0 w-full">
                  <div className="basis-0 content-stretch flex gap-[5px] grow items-center min-h-px min-w-px relative shrink-0">
                    <div className="relative shrink-0 size-[18px]">
                      <img alt="" className="block max-w-none size-full" src="/9eec953f9cf5fbef4f7cf8bce917822caa2abb2a.svg" />
                    </div>
                    <p className="font-normal leading-none relative shrink-0 text-[#696565] text-[13px] text-center text-nowrap whitespace-pre">
                      Base Sepolia ledger
                    </p>
                  </div>
                  <span className="font-medium text-[#1e1e1e] text-[13px]">Deployment pending</span>
                </div>

                {/* PEPs collected */}
                <div className="content-stretch flex gap-px h-[18px] items-center relative shrink-0 w-full">
                  <div className="basis-0 content-stretch flex gap-[5px] grow items-center min-h-px min-w-px relative shrink-0">
                    <div className="relative shrink-0 size-[18px]">
                      <img alt="" className="block max-w-none size-full" src="/e0e3358d034927fa2be75ee69e47e1c714d643d8.svg" />
                    </div>
                    <p className="font-normal leading-none relative shrink-0 text-[#696565] text-[13px] text-center text-nowrap whitespace-pre">
                      PEPs collected
                    </p>
                  </div>
                  <p className="font-medium leading-none relative shrink-0 text-[#1e1e1e] text-[16px] text-nowrap whitespace-pre">
                    6,000
                  </p>
                </div>

                {/* Active since */}
                <div className="content-stretch flex gap-px h-[18px] items-center relative shrink-0 w-full">
                  <div className="basis-0 content-stretch flex gap-[5px] grow items-center min-h-px min-w-px relative shrink-0">
                    <div className="relative shrink-0 size-[18px]">
                      <img alt="" className="block max-w-none size-full" src="/6d2b3447e269c556c90768d3f04b9c770b366447.svg" />
                    </div>
                    <p className="font-normal leading-none relative shrink-0 text-[#696565] text-[13px] text-center text-nowrap whitespace-pre">
                      Active since:
                    </p>
                  </div>
                  <p className="font-medium leading-none relative shrink-0 text-[#1e1e1e] text-[16px] text-nowrap whitespace-pre">
                    Sept 15, 2025
                  </p>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Custom CSS for the icon */}
      <style jsx global>{`
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
