'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { venuesService } from '@/services/venues.service';
import { Venue } from '@/types';
import { VenueModal } from '@/components/forms/venue-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Plus, Search, MapPin, Edit2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function VenuesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const { data: venues, isLoading, isError, error } = useQuery({
    queryKey: ['venues'],
    queryFn: () => venuesService.getAll(),
  });

  const filteredVenues = (venues || []).filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.building && v.building.toLowerCase().includes(q))
    );
  });

  const handleCreate = () => {
    setSelectedVenue(null);
    setIsModalOpen(true);
  };

  const handleEdit = (v: Venue) => {
    setSelectedVenue(v);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Campus Venues</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage placement halls, auditoriums, labs, and seating capacities.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Venue</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by venue name or building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-xs text-slate-500 ml-auto font-medium">
            Total Venues: <span className="font-bold text-slate-900">{filteredVenues.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Data Area */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          Failed to load venues: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : filteredVenues.length === 0 ? (
        <EmptyState
          title="No Venues Found"
          description={searchQuery ? 'No venues match your search query.' : 'Get started by adding your first campus placement hall or venue.'}
          icon={MapPin}
          actionLabel={searchQuery ? undefined : 'Add Venue'}
          onAction={searchQuery ? undefined : handleCreate}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Venue Name</th>
                  <th className="px-6 py-3.5">Building / Location</th>
                  <th className="px-6 py-3.5">Seating Capacity</th>
                  <th className="px-6 py-3.5">Total Sessions</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredVenues.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{v.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {v.building || <span className="text-slate-400 text-xs">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      {v.capacity ? (
                        <Badge variant="emerald">{v.capacity} seats</Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">Unspecified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {(v._count?.classSessions ?? 0) + (v._count?.placementDrives ?? 0)} events
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(v.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(v)}
                        className="gap-1.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <VenueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        venue={selectedVenue}
      />
    </div>
  );
}
