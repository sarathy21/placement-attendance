'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Subject } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsService } from '@/services/subjects.service';
import { showToast } from '@/hooks/use-toast';

const subjectSchema = z.object({
  code: z.string().min(1, 'Subject code is required'),
  title: z.string().min(1, 'Subject title is required'),
  description: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: Subject | null;
}

export function SubjectModal({ isOpen, onClose, subject }: SubjectModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!subject;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      code: '',
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (subject) {
      reset({
        code: subject.code,
        title: subject.title,
        description: subject.description || '',
      });
    } else {
      reset({
        code: '',
        title: '',
        description: '',
      });
    }
  }, [subject, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: SubjectFormData) => {
      if (isEditing && subject) {
        return subjectsService.update(subject.id, data);
      }
      return subjectsService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showToast(
        'success',
        isEditing ? 'Subject Updated' : 'Subject Created',
        `Subject/module has been successfully ${isEditing ? 'updated' : 'created'}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Operation Failed', err.message);
    },
  });

  const onSubmit = (data: SubjectFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Subject / Module' : 'Create Subject / Training Module'}
      description={isEditing ? 'Update subject details.' : 'Add a new subject or placement training module.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Subject Code"
          placeholder="e.g. JAVA-FS, PYTHON-DS, APT-01"
          error={errors.code?.message}
          {...register('code')}
        />

        <Input
          label="Subject / Module Title"
          placeholder="e.g. Java Full Stack Training"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="w-full space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Description (Optional)
          </label>
          <textarea
            className="flex min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-xs"
            placeholder="Brief overview of course outline or objectives"
            {...register('description')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update Subject' : 'Create Subject'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
