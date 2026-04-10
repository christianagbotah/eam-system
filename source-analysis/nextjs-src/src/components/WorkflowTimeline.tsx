'use client';

import { CheckCircle, Clock, XCircle, Send, Wrench, FileCheck } from 'lucide-react';

interface WorkflowStep {
  status: string;
  label: string;
  icon: any;
  color: string;
}

const workflowSteps: WorkflowStep[] = [
  { status: 'pending', label: 'Submitted', icon: Clock, color: 'blue' },
  { status: 'supervisor_review', label: 'Under Review', icon: Clock, color: 'yellow' },
  { status: 'approved', label: 'Approved', icon: CheckCircle, color: 'green' },
  { status: 'assigned_to_planner', label: 'Assigned to Planner', icon: Send, color: 'purple' },
  { status: 'work_order_created', label: 'Work Order Created', icon: Wrench, color: 'indigo' },
  { status: 'completed', label: 'Work Completed', icon: CheckCircle, color: 'blue' },
  { status: 'satisfactory', label: 'Marked Satisfactory', icon: CheckCircle, color: 'teal' },
  { status: 'closed', label: 'Closed', icon: FileCheck, color: 'green' }
];

interface WorkflowTimelineProps {
  currentStatus: string;
  isRejected?: boolean;
}

export default function WorkflowTimeline({ currentStatus, isRejected = false }: WorkflowTimelineProps) {
  // Debug: Log the current status
  console.log('WorkflowTimeline - currentStatus:', currentStatus);
  
  const getCurrentStepIndex = () => {
    const index = workflowSteps.findIndex(step => step.status === currentStatus);
    console.log('WorkflowTimeline - currentIndex:', index, 'for status:', currentStatus);
    // If status not found, default to first step (pending)
    return index >= 0 ? index : 0;
  };

  const currentIndex = getCurrentStepIndex();

  const getStepStatus = (index: number) => {
    if (isRejected && index > 0) return 'rejected';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  const getColorClasses = (color: string, status: string) => {
    if (status === 'rejected') {
      return {
        bg: 'bg-red-100',
        border: 'border-red-500',
        text: 'text-red-700',
        icon: 'text-red-600'
      };
    }
    
    if (status === 'completed') {
      return {
        bg: 'bg-green-100',
        border: 'border-green-500',
        text: 'text-green-700',
        icon: 'text-green-600'
      };
    }
    
    if (status === 'current') {
      const colors: any = {
        blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700', icon: 'text-blue-600' },
        yellow: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700', icon: 'text-yellow-600' },
        green: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700', icon: 'text-green-600' },
        purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700', icon: 'text-purple-600' },
        indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-700', icon: 'text-indigo-600' },
        teal: { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-700', icon: 'text-teal-600' }
      };
      return colors[color] || colors.blue;
    }
    
    return {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      text: 'text-gray-500',
      icon: 'text-gray-400'
    };
  };

  if (isRejected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-500">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-red-900" style={{ fontSize: '0.875rem' }}>Rejected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
      <div 
        className="absolute left-4 top-4 w-0.5 bg-green-500 transition-all duration-500"
        style={{ height: `${(currentIndex / (workflowSteps.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      <div className="space-y-4">
        {workflowSteps.map((step, index) => {
          const status = getStepStatus(index);
          const colors = getColorClasses(step.color, status);
          const Icon = step.icon;

          return (
            <div key={step.status} className="relative flex items-center gap-3">
              <div className={`flex-shrink-0 w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center border-2 ${colors.border} z-10`}>
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${colors.text}`} style={{ fontSize: '0.8125rem' }}>{step.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
