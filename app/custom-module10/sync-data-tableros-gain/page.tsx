'use client';

import TablerosGainViewer from '@/modules-custom/sync-data-tableros-gain/Viewer';

export default function SyncDataTablerosGainPublicPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <TablerosGainViewer dataEndpoint="/api/custom-module10/sync-data-tableros-gain" />
      </div>
    </div>
  );
}
