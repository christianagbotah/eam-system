import { create } from 'zustand';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type {
  WorkInstruction,
  WorkInstructionExecution,
  StepResult,
  SafetyResult,
  ToolVerification,
  PartVerification,
} from '@/types';

interface WorkExecutionState {
  // Active execution
  activeInstruction: WorkInstruction | null;
  activeExecution: WorkInstructionExecution | null;
  currentStep: number;
  stepResults: StepResult[];
  safetyResults: SafetyResult[];
  toolVerifications: ToolVerification[];
  partVerifications: PartVerification[];
  technicianNotes: string;
  executionStatus: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
  isLoading: boolean;
  error: string | null;

  // Actions
  loadInstruction: (instructionId: string) => Promise<void>;
  loadInstructionsByComponent: (componentId: string, assetId?: string) => Promise<WorkInstruction[]>;
  startExecution: (workOrderId?: string) => Promise<void>;
  pauseExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>;
  completeExecution: () => Promise<void>;
  abandonExecution: () => Promise<void>;
  markStepComplete: (stepNumber: number, step: { title: string; estimatedMinutes: number; verificationRequired: boolean; verificationSpec: string | null }) => void;
  markSafetyComplete: (stepNumber: number, isPassed: boolean) => void;
  markToolVerified: (toolId: string, toolName: string) => void;
  markPartVerified: (partId: string, partName: string) => void;
  setTechnicianNotes: (notes: string) => void;
  resetExecution: () => void;
  loadExecutionHistory: (instructionId?: string, technicianId?: string) => Promise<WorkInstructionExecution[]>;
}

export const useWorkExecutionStore = create<WorkExecutionState>((set, get) => ({
  activeInstruction: null,
  activeExecution: null,
  currentStep: 1,
  stepResults: [],
  safetyResults: [],
  toolVerifications: [],
  partVerifications: [],
  technicianNotes: '',
  executionStatus: 'not_started',
  isLoading: false,
  error: null,

  loadInstruction: async (instructionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<WorkInstruction>(`/api/work-instructions/${instructionId}`);
      if (res.success) {
        set({ activeInstruction: res.data ?? null, isLoading: false });
      } else {
        set({ error: res.error || 'Failed to load instruction', isLoading: false });
      }
    } catch {
      set({ error: 'Failed to load instruction', isLoading: false });
    }
  },

  loadInstructionsByComponent: async (componentId: string, assetId?: string) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams({ componentId });
      if (assetId) params.set('assetId', assetId);
      params.set('limit', '1');
      const res = await api.get<WorkInstruction[]>(`/api/work-instructions?${params.toString()}`);
      if (res.success) {
        set({ isLoading: false });
        return res.data as WorkInstruction[];
      }
      set({ isLoading: false });
      return [];
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  startExecution: async (workOrderId?: string) => {
    const { activeInstruction, safetyResults } = get();
    if (!activeInstruction) return;

    set({ isLoading: true });
    try {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const technicianId = user?.id || 'unknown';

      const res = await api.post(`/api/work-instructions/${activeInstruction.id}/execute`, {
        action: 'start',
        workOrderId: workOrderId || '',
        technicianId,
        stepResults: [],
        safetyResults,
        toolVerifications: [],
        partVerifications: [],
        notes: '',
        completionEvidence: [],
      });
      if (res.success) {
        set({
          executionStatus: 'in_progress',
          activeExecution: res.data?.execution || null,
          currentStep: 1,
          stepResults: [],
          safetyResults: [],
          toolVerifications: [],
          partVerifications: [],
          isLoading: false,
        });
      } else {
        set({ error: res.error, executionStatus: 'in_progress', isLoading: false });
      }
    } catch {
      set({ executionStatus: 'in_progress', isLoading: false });
    }
  },

  pauseExecution: async () => {
    const { activeInstruction, stepResults, technicianNotes } = get();
    if (!activeInstruction) return;

    set({ isLoading: true });
    try {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const technicianId = user?.id || 'unknown';

      await api.post(`/api/work-instructions/${activeInstruction.id}/execute`, {
        action: 'pause',
        executionId: get().activeExecution?.id,
        technicianId,
        stepResults,
        notes: technicianNotes,
        completionEvidence: [],
      });
    } catch { /* silent */ }

    set({ executionStatus: 'paused', isLoading: false });
  },

  resumeExecution: async () => {
    const { activeInstruction } = get();
    if (!activeInstruction) return;

    set({ isLoading: true });
    try {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const technicianId = user?.id || 'unknown';

      await api.post(`/api/work-instructions/${activeInstruction.id}/execute`, {
        action: 'resume',
        executionId: get().activeExecution?.id,
        workOrderId: '',
        technicianId,
      });
      set({ executionStatus: 'in_progress', isLoading: false });
    } catch {
      set({ executionStatus: 'in_progress', isLoading: false });
    }
  },

  completeExecution: async () => {
    const {
      activeInstruction,
      stepResults,
      safetyResults,
      toolVerifications,
      partVerifications,
      technicianNotes,
    } = get();
    if (!activeInstruction) return;

    set({ isLoading: true });
    try {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const technicianId = user?.id || 'unknown';

      const res = await api.post(`/api/work-instructions/${activeInstruction.id}/execute`, {
        action: 'complete',
        executionId: get().activeExecution?.id,
        technicianId,
        workOrderId: '',
        stepResults,
        safetyResults,
        toolVerifications,
        partVerifications,
        notes: technicianNotes,
        completionEvidence: [],
      });

      set({
        executionStatus: 'completed',
        activeExecution: res.data?.execution || get().activeExecution,
        isLoading: false,
      });
    } catch {
      set({ executionStatus: 'completed', isLoading: false });
    }
  },

  abandonExecution: async () => {
    const { activeInstruction } = get();
    if (!activeInstruction) return;

    set({ isLoading: true });
    try {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const technicianId = user?.id || 'unknown';

      await api.post(`/api/work-instructions/${activeInstruction.id}/execute`, {
        action: 'abandon',
        executionId: get().activeExecution?.id,
        workOrderId: '',
        technicianId,
      });
    } catch { /* silent */ }

    set({
      executionStatus: 'not_started',
      currentStep: 1,
      stepResults: [],
      safetyResults: [],
      toolVerifications: [],
      partVerifications: [],
      isLoading: false,
    });
  },

  markStepComplete: (stepNumber: number, step: { title: string; estimatedMinutes: number; verificationRequired: boolean; verificationSpec: string | null }) => {
    const { stepResults, activeInstruction } = get();
    if (!activeInstruction) return;

    const result: StepResult = {
      stepNumber,
      status: 'completed',
      completedAt: new Date().toISOString(),
      verificationResult: step.verificationRequired ? 'pass' : null,
      verificationValue: step.verificationSpec || null,
      notes: null,
      mediaUrls: [],
      duration: step.estimatedMinutes,
    };

    const existing = stepResults.findIndex(r => r.stepNumber === stepNumber);
    const updated = [...stepResults];
    if (existing >= 0) {
      updated[existing] = result;
    } else {
      updated.push(result);
    }

    const steps = activeInstruction.steps;
    const nextStep = stepNumber + 1 <= steps.length ? stepNumber + 1 : stepNumber;
    set({ stepResults: updated, currentStep: nextStep });
  },

  markSafetyComplete: (stepNumber: number, isPassed: boolean) => {
    const { safetyResults } = get();
    const technicianId = useAuthStore.getState().user?.id || 'unknown';

    const result: SafetyResult = {
      stepNumber,
      isPassed,
      acknowledgedById: technicianId,
      acknowledgedAt: new Date().toISOString(),
      notes: null,
    };

    const existing = safetyResults.findIndex(r => r.stepNumber === stepNumber);
    const updated = [...safetyResults];
    if (existing >= 0) {
      updated[existing] = result;
    } else {
      updated.push(result);
    }

    set({ safetyResults: updated });
  },

  markToolVerified: (toolId: string, toolName: string) => {
    const { toolVerifications } = get();
    const technicianId = useAuthStore.getState().user?.id || 'unknown';

    const verification: ToolVerification = {
      toolId,
      toolName,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      verifiedById: technicianId,
      notes: null,
    };

    const existing = toolVerifications.findIndex(r => r.toolId === toolId);
    const updated = [...toolVerifications];
    if (existing >= 0) {
      updated[existing] = verification;
    } else {
      updated.push(verification);
    }

    set({ toolVerifications: updated });
  },

  markPartVerified: (partId: string, partName: string) => {
    const { partVerifications } = get();
    const technicianId = useAuthStore.getState().user?.id || 'unknown';

    const verification: PartVerification = {
      partId,
      partName,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      verifiedById: technicianId,
      quantityVerified: null,
      notes: null,
    };

    const existing = partVerifications.findIndex(r => r.partId === partId);
    const updated = [...partVerifications];
    if (existing >= 0) {
      updated[existing] = verification;
    } else {
      updated.push(verification);
    }

    set({ partVerifications: updated });
  },

  setTechnicianNotes: (notes: string) => {
    set({ technicianNotes: notes });
  },

  resetExecution: () => {
    set({
      activeExecution: null,
      currentStep: 1,
      stepResults: [],
      safetyResults: [],
      toolVerifications: [],
      partVerifications: [],
      technicianNotes: '',
      executionStatus: 'not_started',
      error: null,
    });
  },

  loadExecutionHistory: async (instructionId?: string, technicianId?: string) => {
    try {
      const params = new URLSearchParams();
      if (instructionId) params.set('instructionId', instructionId);
      if (technicianId) params.set('technicianId', technicianId);
      const res = await api.get<WorkInstructionExecution[]>(`/api/work-instructions/executions?${params.toString()}`);
      if (res.success) {
        return res.data as WorkInstructionExecution[];
      }
      return [];
    } catch {
      return [];
    }
  },
}));
