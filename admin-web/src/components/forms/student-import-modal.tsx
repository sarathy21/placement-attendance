'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ImportPreviewResponse, StudentRowPreview, StudentImportRow } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/services/students.service';
import { showToast } from '@/hooks/use-toast';
import {
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  FileCheck,
} from 'lucide-react';

export interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudentImportModal({ isOpen, onClose }: StudentImportModalProps) {
  const queryClient = useQueryClient();

  // Step state: 1 = File Upload, 2 = Preview & Validation, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [rowFilter, setRowFilter] = useState<'ALL' | 'VALID' | 'INVALID_OR_DUP'>('ALL');

  // Reset modal state on close
  const handleClose = () => {
    setStep(1);
    setSelectedFile(null);
    setFileError(null);
    setPreviewData(null);
    setRowFilter('ALL');
    onClose();
  };

  // Stage 1: File selection & validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const filename = file.name.toLowerCase();

    if (!filename.endsWith('.xlsx')) {
      setFileError('Invalid file type. Only Excel (.xlsx) files are supported.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Preview mutation (POST /students/import/preview)
  const previewMutation = useMutation({
    mutationFn: (file: File) => studentsService.previewImport(file),
    onSuccess: (data) => {
      setPreviewData(data);
      setStep(2);
    },
    onError: (err: Error) => {
      showToast('error', 'Preview Failed', err.message);
    },
  });

  // Confirm import mutation (POST /students/import/confirm)
  const confirmMutation = useMutation({
    mutationFn: (rows: StudentImportRow[]) => studentsService.confirmImport(rows),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast('success', 'Import Successful', res.message);
      handleClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Import Execution Failed', err.message);
    },
  });

  const handleUploadAndPreview = () => {
    if (!selectedFile) {
      setFileError('Please select a valid .xlsx file.');
      return;
    }
    previewMutation.mutate(selectedFile);
  };

  const handleProceedToConfirmation = () => {
    if (!previewData || !previewData.canImport) return;
    setStep(3);
  };

  const handleExecuteImport = () => {
    if (!previewData || !previewData.canImport) return;

    // Extract valid student rows for confirmation body
    const validRows: StudentImportRow[] = previewData.rows
      .filter((r) => r.status === 'VALID')
      .map((r) => ({
        registerNumber: r.data.registerNumber,
        collegeEmail: r.data.collegeEmail,
        firstName: r.data.firstName,
        lastName: r.data.lastName,
        departmentCode: r.data.departmentCode,
        courseCode: r.data.courseCode,
        placementBatchName: r.data.placementBatchName,
        phoneNumber: r.data.phoneNumber,
      }));

    confirmMutation.mutate(validRows);
  };

  // Filter rows for stage 2 table
  const displayedRows = (previewData?.rows || []).filter((r) => {
    if (rowFilter === 'VALID') return r.status === 'VALID';
    if (rowFilter === 'INVALID_OR_DUP') return r.status === 'INVALID' || r.status === 'DUPLICATE';
    return true;
  });

  const getStatusBadge = (status: StudentRowPreview['status']) => {
    switch (status) {
      case 'VALID':
        return <Badge variant="emerald">VALID</Badge>;
      case 'INVALID':
        return <Badge variant="rose">INVALID</Badge>;
      case 'DUPLICATE':
        return <Badge variant="amber">DUPLICATE</Badge>;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Student Import (.xlsx)"
      description="Upload an Excel worksheet to validate and onboard placement students."
      maxWidth="xl"
    >
      {/* Step Indicator */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs font-semibold">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
            1
          </span>
          <span>1. Upload File</span>
        </div>
        <div className="w-8 h-px bg-slate-200" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
            2
          </span>
          <span>2. Preview & Validation</span>
        </div>
        <div className="w-8 h-px bg-slate-200" />
        <div className={`flex items-center gap-2 ${step === 3 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
            3
          </span>
          <span>3. Confirm Import</span>
        </div>
      </div>

      {/* STAGE 1: FILE UPLOAD */}
      {step === 1 && (
        <div className="space-y-4 py-2">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-900">Upload Placement Student Sheet (.xlsx)</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Supported Headers: <br />
              <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-800 font-mono">
                Register No, Name, Email, Phone, Department, Course, Placement Batch
              </code>
            </p>

            <div className="mt-6 flex justify-center">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Select Excel File</span>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {selectedFile && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          {fileError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={handleClose} disabled={previewMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadAndPreview}
              disabled={!selectedFile}
              isLoading={previewMutation.isPending}
            >
              Generate Import Preview
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 2: PREVIEW & VALIDATION */}
      {step === 2 && previewData && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">Total Rows</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{previewData.totalRows}</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/60 border-emerald-200">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-emerald-700">Valid Rows</p>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">{previewData.validRows}</p>
              </CardContent>
            </Card>

            <Card className="bg-rose-50/60 border-rose-200">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-rose-700">Invalid Rows</p>
                <p className="text-lg font-bold text-rose-800 mt-0.5">{previewData.invalidRows}</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/60 border-amber-200">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-amber-700">Duplicate Rows</p>
                <p className="text-lg font-bold text-amber-800 mt-0.5">{previewData.duplicateRows}</p>
              </CardContent>
            </Card>
          </div>

          {/* Alert Banner */}
          {previewData.canImport ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Validation passed. All student rows are valid and ready to import.</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                Import blocked. Excel file contains {previewData.invalidRows + previewData.duplicateRows} row errors or duplicates. Correct the file and re-upload.
              </span>
            </div>
          )}

          {/* Table Filters & Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Validation Rows Detail:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  onClick={() => setRowFilter('ALL')}
                  className={`px-2 py-1 rounded-md transition-colors ${rowFilter === 'ALL' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                >
                  All ({previewData.totalRows})
                </button>
                <button
                  onClick={() => setRowFilter('VALID')}
                  className={`px-2 py-1 rounded-md transition-colors ${rowFilter === 'VALID' ? 'bg-white font-bold text-emerald-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  Valid ({previewData.validRows})
                </button>
                <button
                  onClick={() => setRowFilter('INVALID_OR_DUP')}
                  className={`px-2 py-1 rounded-md transition-colors ${rowFilter === 'INVALID_OR_DUP' ? 'bg-white font-bold text-rose-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  Errors ({previewData.invalidRows + previewData.duplicateRows})
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Reg No</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Dept</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Placement Batch</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedRows.map((r) => (
                    <tr key={r.rowNumber} className={r.status !== 'VALID' ? 'bg-rose-50/30' : ''}>
                      <td className="px-3 py-2 font-mono text-slate-500">{r.rowNumber}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-900">{r.data.registerNumber || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{r.data.collegeEmail || '—'}</td>
                      <td className="px-3 py-2 text-slate-900 font-medium">
                        {r.data.firstName} {r.data.lastName || ''}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{r.data.departmentCode || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{r.data.courseCode || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-emerald-800">{r.data.placementBatchName || '—'}</td>
                      <td className="px-3 py-2">{getStatusBadge(r.status)}</td>
                      <td className="px-3 py-2">
                        {r.errors.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {r.errors.map((err, i) => (
                              <span key={i} className="text-[10px] text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded">
                                {err}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Upload</span>
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleProceedToConfirmation}
                disabled={!previewData.canImport}
              >
                Proceed to Confirm ({previewData.validRows})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: CONFIRMATION */}
      {step === 3 && previewData && (
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900">Confirm Student Account Creation</h4>
                <p className="text-xs text-slate-600">
                  You are about to create <span className="font-bold text-slate-900">{previewData.validRows}</span> student accounts in the database.
                </p>
              </div>
            </div>

            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside bg-white p-3 rounded-lg border border-slate-200">
              <li>Accounts will be created with status <strong className="text-emerald-700">ACTIVE</strong>.</li>
              <li>Placement drive eligibility will be <strong className="text-emerald-700">ENABLED</strong> by default.</li>
              <li>Initial student login password will be set to their <strong className="font-mono text-slate-800">registerNumber</strong>.</li>
              <li>Operational audit logs will record this bulk import event.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} disabled={confirmMutation.isPending} className="gap-1 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Preview</span>
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleClose} disabled={confirmMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleExecuteImport}
                isLoading={confirmMutation.isPending}
                variant="default"
              >
                Confirm & Import {previewData.validRows} Students
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
