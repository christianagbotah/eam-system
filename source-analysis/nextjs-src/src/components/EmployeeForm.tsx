'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import SearchableSelect from './SearchableSelect';
import PhoneInput from './PhoneInput';
import MultiSelectCheckbox from './ui/MultiSelectCheckbox';

interface EmployeeFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export default function EmployeeForm({ initialData, onSubmit, onCancel, isEdit }: EmployeeFormProps) {
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [formData, setFormData] = useState(initialData || {
    // Personal
    title: '', first_name: '', middle_name: '', last_name: '', date_of_birth: '', gender: '', marital_status: '', nationality: '', national_id: '', ssnit_number: '', tin_number: '', blood_group: '',
    // Contact
    email: '', personal_email: '', work_email: '', phone: '', home_phone: '', work_phone: '', residential_address: '', postal_address: '', region: '', district: '', hometown: '',
    // Employment
    staff_id: '', username: '', role: 'technician', employment_type: 'permanent', employment_status: 'active', department_id: '', supervisor_id: '', hire_date: '', contract_start_date: '', contract_end_date: '', probation_end_date: '', grade_level: '', step: '', work_location: '', shift_type: '', trade: '', hourly_rate: '',
    // Education
    highest_education: '', institution: '', field_of_study: '', graduation_year: '', professional_certifications: '', licenses: '', license_expiry_date: '',
    // Bank
    bank_name: '', bank_branch: '', account_number: '', account_name: '', basic_salary: '', allowances: '', payment_frequency: 'monthly',
    // Emergency
    emergency_contact_1_name: '', emergency_contact_1_phone: '', emergency_contact_1_relationship: '', emergency_contact_1_address: '',
    emergency_contact_2_name: '', emergency_contact_2_phone: '', emergency_contact_2_relationship: '', emergency_contact_2_address: '',
    // Multi-Plant
    plant_ids: [],
    plant_id: '',
    primary_plant_id: '',
    // Auth
    password: ''
  });

  useEffect(() => {
    loadDepartments();
    loadSupervisors();
    loadSkills();
    loadPlants();
  }, []);

  useEffect(() => {
    if (formData.department_id && !isEdit) {
      generateStaffId(formData.department_id);
    }
  }, [formData.department_id]);

  const loadDepartments = async () => {
    try {
      const res = await api.get('/departments');
      const depts = res.data?.data || res.data || [];
      console.log('Loaded departments:', depts);
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadSupervisors = async () => {
    try {
      const res = await api.get('/users');
      const allUsers = res.data?.data || [];
      setSupervisors(allUsers.filter((u: any) => ['supervisor', 'manager', 'admin'].includes(u.role)));
    } catch (error) {
      console.error('Error loading supervisors:', error);
    }
  };

  const loadSkills = async () => {
    try {
      const res = await api.get('/skills');
      const skillsList = res.data?.data || res.data || [];
      setSkills(skillsList.filter((s: any) => s.is_active));
    } catch (error) {
      console.error('Error loading skills:', error);
    }
  };

  const loadPlants = async () => {
    try {
      const res = await api.get('/plants');
      const plantsList = res.data?.data || res.data || [];
      setPlants(plantsList.filter((p: any) => p.is_active));
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

  const generateStaffId = async (deptId: number) => {
    try {
      const res = await api.get(`/departments/${deptId}/generate-staff-id`);
      if (res.data?.data?.staff_id) {
        setFormData(prev => ({ ...prev, staff_id: res.data.data.staff_id }));
      }
    } catch (error) {
      console.error('Error generating staff ID:', error);
    }
  };

  const steps = [
    { id: 1, name: 'Personal', icon: '👤' },
    { id: 2, name: 'Contact', icon: '📞' },
    { id: 3, name: 'Employment', icon: '💼' },
    { id: 4, name: 'Education', icon: '🎓' },
    { id: 5, name: 'Bank', icon: '💰' },
    { id: 6, name: 'Emergency', icon: '🚨' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const nextStep = () => setStep(Math.min(step + 1, 6));
  const prevStep = () => setStep(Math.max(step - 1, 1));

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Sticky Progress Bar */}
      <div className="sticky top-0 bg-white z-20 pb-3 border-b">
        <div className="flex justify-between items-center">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex flex-col items-center ${step >= s.id ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-base ${step >= s.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {s.icon}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">{s.name}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1.5 ${step > s.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-1 py-4">
        <form onSubmit={handleSubmit} noValidate>
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-2">
            <h3 className="text-base font-bold mb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <SearchableSelect
                value={formData.title}
                onChange={(val) => setFormData({...formData, title: val})}
                options={[
                  { id: 'Mr', label: 'Mr' },
                  { id: 'Mrs', label: 'Mrs' },
                  { id: 'Ms', label: 'Ms' },
                  { id: 'Dr', label: 'Dr' }
                ]}
                placeholder="Select Title"
                label="Title"
              />
              <div>
                <label className="block text-xs font-medium mb-1">First Name *</label>
                <input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Middle Name</label>
                <input type="text" value={formData.middle_name} onChange={(e) => setFormData({...formData, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Birth</label>
                <input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <SearchableSelect
                value={formData.gender}
                onChange={(val) => setFormData({...formData, gender: val})}
                options={[
                  { id: 'male', label: 'Male' },
                  { id: 'female', label: 'Female' },
                  { id: 'other', label: 'Other' }
                ]}
                placeholder="Select Gender"
                label="Gender"
              />
              <SearchableSelect
                value={formData.marital_status}
                onChange={(val) => setFormData({...formData, marital_status: val})}
                options={[
                  { id: 'single', label: 'Single' },
                  { id: 'married', label: 'Married' },
                  { id: 'divorced', label: 'Divorced' },
                  { id: 'widowed', label: 'Widowed' }
                ]}
                placeholder="Select Marital Status"
                label="Marital Status"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Nationality</label>
                <input type="text" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">National ID</label>
                <input type="text" value={formData.national_id} onChange={(e) => setFormData({...formData, national_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Ghana Card, Passport" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SSNIT Number</label>
                <input type="text" value={formData.ssnit_number} onChange={(e) => setFormData({...formData, ssnit_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TIN Number</label>
                <input type="text" value={formData.tin_number} onChange={(e) => setFormData({...formData, tin_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <SearchableSelect
                value={formData.blood_group}
                onChange={(val) => setFormData({...formData, blood_group: val})}
                options={[
                  { id: 'A+', label: 'A+' },
                  { id: 'A-', label: 'A-' },
                  { id: 'B+', label: 'B+' },
                  { id: 'B-', label: 'B-' },
                  { id: 'O+', label: 'O+' },
                  { id: 'O-', label: 'O-' },
                  { id: 'AB+', label: 'AB+' },
                  { id: 'AB-', label: 'AB-' }
                ]}
                placeholder="Select Blood Group"
                label="Blood Group"
              />
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Work Email *</label>
                <input type="email" value={formData.work_email || formData.email} onChange={(e) => setFormData({...formData, work_email: e.target.value, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Personal Email</label>
                <input type="email" value={formData.personal_email} onChange={(e) => setFormData({...formData, personal_email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <PhoneInput value={formData.work_phone || formData.phone} onChange={(val) => setFormData({...formData, work_phone: val, phone: val})} label="Work Phone *" />
              <PhoneInput value={formData.home_phone} onChange={(val) => setFormData({...formData, home_phone: val})} label="Home Phone" />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Residential Address</label>
                <input type="text" value={formData.residential_address} onChange={(e) => setFormData({...formData, residential_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Postal Address</label>
                <input type="text" value={formData.postal_address} onChange={(e) => setFormData({...formData, postal_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Region</label>
                <input type="text" value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">District</label>
                <input type="text" value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hometown</label>
                <input type="text" value={formData.hometown} onChange={(e) => setFormData({...formData, hometown: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Employment */}
        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">Employment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SearchableSelect
                value={formData.department_id}
                onChange={(val) => setFormData({...formData, department_id: val})}
                options={departments.map(d => ({ id: d.id, label: d.department_name || d.name, sublabel: d.department_code }))}
                placeholder="Select Department"
                label="Department"
                required
              />
              <SearchableSelect
                value={formData.supervisor_id}
                onChange={(val) => setFormData({...formData, supervisor_id: val})}
                options={supervisors
                  .filter(s => !formData.department_id || s.department_id == formData.department_id)
                  .map(s => ({ id: s.id, label: s.full_name || s.username, sublabel: s.role }))}
                placeholder="Select Supervisor"
                label="Supervisor"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Staff ID *</label>
                <input type="text" value={formData.staff_id} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-sm" placeholder="Auto-generated" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <SearchableSelect
                value={formData.role}
                onChange={(val) => setFormData({...formData, role: val})}
                options={[
                  { id: 'technician', label: 'Technician' },
                  { id: 'operator', label: 'Operator' },
                  { id: 'supervisor', label: 'Supervisor' },
                  { id: 'planner', label: 'Planner' },
                  { id: 'manager', label: 'Manager' },
                  { id: 'shop-attendant', label: 'Shop Attendant' },
                  { id: 'admin', label: 'Admin' }
                ]}
                placeholder="Select Role"
                label="Role"
                required
              />
              <SearchableSelect
                value={formData.employment_type}
                onChange={(val) => setFormData({...formData, employment_type: val})}
                options={[
                  { id: 'permanent', label: 'Permanent' },
                  { id: 'contract', label: 'Contract' },
                  { id: 'temporary', label: 'Temporary' },
                  { id: 'casual', label: 'Casual' },
                  { id: 'intern', label: 'Intern' }
                ]}
                placeholder="Select Employment Type"
                label="Employment Type"
                required
              />
              <div>
                <label className="block text-sm font-medium mb-1">Hire Date</label>
                <input type="date" value={formData.hire_date} onChange={(e) => setFormData({...formData, hire_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contract Start</label>
                <input type="date" value={formData.contract_start_date} onChange={(e) => setFormData({...formData, contract_start_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contract End</label>
                <input type="date" value={formData.contract_end_date} onChange={(e) => setFormData({...formData, contract_end_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Probation End</label>
                <input type="date" value={formData.probation_end_date} onChange={(e) => setFormData({...formData, probation_end_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grade Level</label>
                <input type="text" value={formData.grade_level} onChange={(e) => setFormData({...formData, grade_level: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Step</label>
                <input type="text" value={formData.step} onChange={(e) => setFormData({...formData, step: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Work Location</label>
                <input type="text" value={formData.work_location} onChange={(e) => setFormData({...formData, work_location: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <SearchableSelect
                value={formData.shift_type}
                onChange={(val) => setFormData({...formData, shift_type: val})}
                options={[
                  { id: 'day', label: 'Day' },
                  { id: 'night', label: 'Night' },
                  { id: 'rotating', label: 'Rotating' },
                  { id: 'flexible', label: 'Flexible' }
                ]}
                placeholder="Select Shift Type"
                label="Shift Type"
              />
              {formData.role === 'technician' && (
                <>
                  <SearchableSelect
                    value={formData.trade}
                    onChange={(val) => setFormData({...formData, trade: val})}
                    options={skills.map(s => ({ id: s.id, label: s.name, sublabel: s.category }))}
                    placeholder="Select Trade/Skill"
                    label="Trade/Skill"
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                    <input type="number" step="0.01" value={formData.hourly_rate} onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Password {isEdit ? '(leave blank to keep current)' : '*'}</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required={!isEdit} />
              </div>
            </div>

            {/* Multi-Plant Assignment */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-900">🏭 Plant Assignment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MultiSelectCheckbox
                  label="Assigned Plants"
                  options={plants.map(p => ({ id: p.id, label: p.plant_name, sublabel: p.plant_code }))}
                  value={formData.plant_ids}
                  onChange={(ids) => {
                    setFormData({...formData, plant_ids: ids});
                    if (ids.length === 1) {
                      setFormData({...formData, plant_ids: ids, plant_id: ids[0], primary_plant_id: ids[0]});
                    } else if (!ids.includes(formData.primary_plant_id)) {
                      setFormData({...formData, plant_ids: ids, plant_id: '', primary_plant_id: ''});
                    }
                  }}
                  placeholder="Select plants..."
                />
                {formData.plant_ids.length > 0 && (
                  <SearchableSelect
                    value={formData.primary_plant_id || formData.plant_id}
                    onChange={(val) => setFormData({...formData, plant_id: val, primary_plant_id: val})}
                    options={plants
                      .filter(p => formData.plant_ids.includes(p.id))
                      .map(p => ({ id: p.id, label: p.plant_name, sublabel: `${p.plant_code} - Primary` }))}
                    placeholder="Select Primary Plant"
                    label="Primary Plant"
                    required
                  />
                )}
              </div>
              {formData.plant_ids.length > 0 && (
                <div className="mt-3 text-xs text-blue-700">
                  ✓ User will have access to {formData.plant_ids.length} plant{formData.plant_ids.length > 1 ? 's' : ''}
                  {formData.primary_plant_id && ` with ${plants.find(p => p.id == formData.primary_plant_id)?.plant_name} as primary`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Education */}
        {step === 4 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">Educational Background</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Highest Education</label>
                <input type="text" value={formData.highest_education} onChange={(e) => setFormData({...formData, highest_education: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Bachelor's Degree" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Institution</label>
                <input type="text" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Field of Study</label>
                <input type="text" value={formData.field_of_study} onChange={(e) => setFormData({...formData, field_of_study: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Graduation Year</label>
                <input type="number" value={formData.graduation_year} onChange={(e) => setFormData({...formData, graduation_year: e.target.value})} className="w-full px-3 py-2 border rounded-lg" min="1950" max="2030" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Professional Certifications</label>
                <textarea value={formData.professional_certifications} onChange={(e) => setFormData({...formData, professional_certifications: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="List certifications" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Licenses</label>
                <input type="text" value={formData.licenses} onChange={(e) => setFormData({...formData, licenses: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">License Expiry</label>
                <input type="date" value={formData.license_expiry_date} onChange={(e) => setFormData({...formData, license_expiry_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Bank & Payroll */}
        {step === 5 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">Bank & Payroll Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <input type="text" value={formData.bank_name} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bank Branch</label>
                <input type="text" value={formData.bank_branch} onChange={(e) => setFormData({...formData, bank_branch: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Number</label>
                <input type="text" value={formData.account_number} onChange={(e) => setFormData({...formData, account_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Name</label>
                <input type="text" value={formData.account_name} onChange={(e) => setFormData({...formData, account_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Basic Salary</label>
                <input type="number" step="0.01" value={formData.basic_salary} onChange={(e) => setFormData({...formData, basic_salary: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Allowances</label>
                <input type="number" step="0.01" value={formData.allowances} onChange={(e) => setFormData({...formData, allowances: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <SearchableSelect
                value={formData.payment_frequency}
                onChange={(val) => setFormData({...formData, payment_frequency: val})}
                options={[
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'bi-weekly', label: 'Bi-Weekly' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'daily', label: 'Daily' }
                ]}
                placeholder="Select Payment Frequency"
                label="Payment Frequency"
              />
            </div>
          </div>
        )}

        {/* Step 6: Emergency */}
        {step === 6 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">Emergency Contacts</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Primary Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input type="text" value={formData.emergency_contact_1_name} onChange={(e) => setFormData({...formData, emergency_contact_1_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <PhoneInput value={formData.emergency_contact_1_phone} onChange={(val) => setFormData({...formData, emergency_contact_1_phone: val})} label="Phone" />
                  <div>
                    <label className="block text-sm font-medium mb-1">Relationship</label>
                    <input type="text" value={formData.emergency_contact_1_relationship} onChange={(e) => setFormData({...formData, emergency_contact_1_relationship: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Spouse" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input type="text" value={formData.emergency_contact_1_address} onChange={(e) => setFormData({...formData, emergency_contact_1_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Secondary Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input type="text" value={formData.emergency_contact_2_name} onChange={(e) => setFormData({...formData, emergency_contact_2_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <PhoneInput value={formData.emergency_contact_2_phone} onChange={(val) => setFormData({...formData, emergency_contact_2_phone: val})} label="Phone" />
                  <div>
                    <label className="block text-sm font-medium mb-1">Relationship</label>
                    <input type="text" value={formData.emergency_contact_2_relationship} onChange={(e) => setFormData({...formData, emergency_contact_2_relationship: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Parent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input type="text" value={formData.emergency_contact_2_address} onChange={(e) => setFormData({...formData, emergency_contact_2_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        </form>
      </div>

      {/* Sticky Navigation Buttons */}
      <div className="sticky bottom-0 bg-white z-20 border-t pt-3">
        <div className="flex justify-between">
          <button type="button" onClick={step === 1 ? onCancel : prevStep} className="px-4 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
            {step === 1 ? 'Cancel' : 'Previous'}
          </button>
          <div className="flex gap-2">
            {step < 6 && (
              <button type="button" onClick={nextStep} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Next
              </button>
            )}
            {step === 6 && (
              <button type="submit" onClick={handleSubmit} className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                {isEdit ? 'Update Employee' : 'Create Employee'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
