'use client';

export default function PMTriggersGuidePage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">PM Triggers & Maintenance Types Guide</h1>
        <p className="text-lg text-gray-600">PM Triggers are automated events that generate work orders for preventive maintenance tasks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Time-Based (TBM)</h2>
          <p className="text-sm text-gray-600 mb-4">Trigger: Time/days</p>
          <p className="text-gray-700 mb-4">Scheduled at fixed intervals regardless of equipment condition.</p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Best For:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Age-related failures</li>
              <li>Compliance-driven tasks</li>
              <li>Predictable wear patterns</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border-l-4 border-green-600">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Usage-Based (UBM)</h2>
          <p className="text-sm text-gray-600 mb-4">Trigger: Usage/Operations</p>
          <p className="text-gray-700 mb-4">Triggered by operating cycles or hours of use.</p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Best For:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Usage cycle equipment</li>
              <li>Actual operating conditions</li>
              <li>High-utilization equipment</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-lg p-6 border-l-4 border-orange-600">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Condition-Based (CBM)</h2>
          <p className="text-sm text-gray-600 mb-4">Trigger: Condition</p>
          <p className="text-gray-700 mb-4">Performed when specific conditions are detected.</p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Best For:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Visual/tactile deterioration</li>
              <li>Sensor-equipped systems</li>
              <li>Critical asset monitoring</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-lg p-6 border-l-4 border-red-600">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Failure-Based (FBM)</h2>
          <p className="text-sm text-gray-600 mb-4">Trigger: Failure</p>
          <p className="text-gray-700 mb-4">Scheduled at breakdowns. Run until failure.</p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Best For:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>PM can cause damage</li>
              <li>Non-critical equipment</li>
              <li>Obvious, safe failures</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Sample PM Task Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">No</th>
                <th className="border border-gray-300 px-3 py-2 text-left">PM Task</th>
                <th className="border border-gray-300 px-3 py-2">Freq</th>
                <th className="border border-gray-300 px-3 py-2">Trigger</th>
                <th className="border border-gray-300 px-3 py-2">Type</th>
                <th className="border border-gray-300 px-3 py-2">Mode</th>
                <th className="border border-gray-300 px-3 py-2">Duration</th>
                <th className="border border-gray-300 px-3 py-2">Inspection</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">1</td>
                <td className="border border-gray-300 px-3 py-2">Inspect bearings (seizer, cracks, wear, pitting, corrosion, lube loss)</td>
                <td className="border border-gray-300 px-3 py-2 text-center">30</td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Time/days</span></td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">UBM</span></td>
                <td className="border border-gray-300 px-3 py-2">Lubrication</td>
                <td className="border border-gray-300 px-3 py-2 text-center">00:10:00</td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Running</span></td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">2</td>
                <td className="border border-gray-300 px-3 py-2">Inspect rollers/shaft ends (wear, crack, axial movement, wobbling)</td>
                <td className="border border-gray-300 px-3 py-2 text-center">20</td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Usage/Ops</span></td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">CBM</span></td>
                <td className="border border-gray-300 px-3 py-2">Inspection</td>
                <td className="border border-gray-300 px-3 py-2 text-center">00:00:20</td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Running</span></td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">3</td>
                <td className="border border-gray-300 px-3 py-2">Open covered seal inspection (leakage, crack, wear, defect)</td>
                <td className="border border-gray-300 px-3 py-2 text-center">40</td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Usage/Ops</span></td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">TBM</span></td>
                <td className="border border-gray-300 px-3 py-2">Replacement</td>
                <td className="border border-gray-300 px-3 py-2 text-center">01:00:00</td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Standstill</span></td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">4</td>
                <td className="border border-gray-300 px-3 py-2">Inspect accessible seal (leakage, crack, wear, defect)</td>
                <td className="border border-gray-300 px-3 py-2 text-center">50</td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Time/days</span></td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">FBM</span></td>
                <td className="border border-gray-300 px-3 py-2">Servicing</td>
                <td className="border border-gray-300 px-3 py-2 text-center">00:00:10</td>
                <td className="border border-gray-300 px-3 py-2"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Standstill</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-lg p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Decision Tree</h2>
        <div className="bg-white rounded-lg p-6 font-mono text-sm">
          <div className="space-y-1">
            <div>Is equipment critical?</div>
            <div className="ml-4">├─ <span className="text-green-600 font-bold">YES</span> → Use <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">CBM</span></div>
            <div className="ml-4">└─ <span className="text-red-600 font-bold">NO</span> → Is failure predictable?</div>
            <div className="ml-8">├─ <span className="text-green-600 font-bold">YES</span> → Use <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">TBM</span></div>
            <div className="ml-8">└─ <span className="text-red-600 font-bold">NO</span> → Is usage trackable?</div>
            <div className="ml-12">├─ <span className="text-green-600 font-bold">YES</span> → Use <span className="bg-green-100 text-green-800 px-2 py-1 rounded">UBM</span></div>
            <div className="ml-12">└─ <span className="text-red-600 font-bold">NO</span> → Use <span className="bg-red-100 text-red-800 px-2 py-1 rounded">FBM</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}