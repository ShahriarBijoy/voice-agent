"use client"

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

type EventFormData = z.infer<typeof eventSchema>;

interface AddEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEventAdd?: (event: EventFormData) => void;
  onEventEdit?: (event: EventFormData) => void;
  defaultDate?: Date;
  mode?: "add" | "edit";
  initialValues?: Partial<EventFormData>;
}

export function AddEventDialog({ isOpen, onClose, onEventAdd, onEventEdit, defaultDate, mode = "add", initialValues }: AddEventDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      location: initialValues?.location ?? "",
      startTime: initialValues?.startTime ?? defaultDate?.toISOString().slice(0, 16),
      endTime:
        initialValues?.endTime ??
        (defaultDate
          ? new Date(defaultDate.getTime() + 60 * 60 * 1000)
              .toISOString()
              .slice(0, 16)
          : undefined),
    },
  });

  useEffect(() => {
    // keep form in sync when switching between add/edit or changing the selected event
    reset({
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      location: initialValues?.location ?? "",
      startTime: initialValues?.startTime ?? defaultDate?.toISOString().slice(0, 16),
      endTime:
        initialValues?.endTime ??
        (defaultDate
          ? new Date(defaultDate.getTime() + 60 * 60 * 1000)
              .toISOString()
              .slice(0, 16)
          : undefined),
    })
  }, [reset, initialValues, defaultDate, mode])

  const onSubmit = (data: EventFormData) => {
    if (mode === "edit" && onEventEdit) onEventEdit(data)
    else if (onEventAdd) onEventAdd(data)
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Event" : "Add New Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="datetime-local" {...register("startTime")} />
              {errors.startTime && <p className="text-destructive text-sm">{errors.startTime.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="datetime-local" {...register("endTime")} />
              {errors.endTime && <p className="text-destructive text-sm">{errors.endTime.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{mode === "edit" ? "Save Changes" : "Add Event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
