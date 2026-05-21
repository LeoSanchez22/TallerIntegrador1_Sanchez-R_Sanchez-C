import { Database, CheckCircle, Clock, AlertCircle, RefreshCw, Download, Upload } from "lucide-react";

const pipelineStages = [
  {
    stage: "Data Ingestion",
    status: "completed",
    progress: 100,
    records: "127,458",
    lastRun: "2 hours ago",
    duration: "12 min",
  },
  {
    stage: "Data Validation",
    status: "completed",
    progress: 100,
    records: "127,458",
    lastRun: "2 hours ago",
    duration: "8 min",
  },
  {
    stage: "Data Cleaning",
    status: "completed",
    progress: 100,
    records: "124,892",
    lastRun: "1 hour ago",
    duration: "15 min",
  },
  {
    stage: "Feature Engineering",
    status: "in-progress",
    progress: 68,
    records: "84,847",
    lastRun: "Running",
    duration: "~10 min remaining",
  },
  {
    stage: "Data Structuring",
    status: "pending",
    progress: 0,
    records: "0",
    lastRun: "Not started",
    duration: "Est. 18 min",
  },
  {
    stage: "Model Training Data Prep",
    status: "pending",
    progress: 0,
    records: "0",
    lastRun: "Not started",
    duration: "Est. 22 min",
  },
];

const dataQuality = [
  { metric: "Completeness", score: 94.2, status: "excellent" },
  { metric: "Accuracy", score: 91.8, status: "excellent" },
  { metric: "Consistency", score: 88.5, status: "good" },
  { metric: "Timeliness", score: 96.7, status: "excellent" },
];

export function DataPipeline() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A365D] mb-2">Data Pipeline</h1>
          <p className="text-[#64748B]">Real-time monitoring of data cleaning and structuring processes</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#00B4D8] text-white rounded-lg hover:bg-[#0096C7] transition-colors">
          <RefreshCw className="w-4 h-4" />
          Refresh Pipeline
        </button>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-br from-[#1A365D] to-[#2D4A73] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-[#00B4D8]" />
            <h2 className="text-xl font-bold">Overall Pipeline Progress</h2>
          </div>
          <span className="text-2xl font-bold">61%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div className="h-3 rounded-full bg-[#00B4D8]" style={{ width: "61%" }}></div>
        </div>
        <p className="text-sm text-white/70 mt-3">3 of 6 stages completed • 1 in progress • 2 pending</p>
      </div>

      {/* Pipeline Stages */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <h3 className="font-semibold text-[#1A365D]">Pipeline Stages</h3>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {pipelineStages.map((stage, index) => (
            <div key={index} className="p-6 hover:bg-[#F8FAFC] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {stage.status === "completed" ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : stage.status === "in-progress" ? (
                    <div className="w-6 h-6 border-3 border-[#00B4D8] border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Clock className="w-6 h-6 text-[#CBD5E1]" />
                  )}
                  <div>
                    <h4 className="font-semibold text-[#1A365D] text-lg">{stage.stage}</h4>
                    <p className="text-sm text-[#64748B]">
                      {stage.records} records • Last run: {stage.lastRun}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#1A365D]">{stage.progress}%</span>
                  <p className="text-sm text-[#64748B]">{stage.duration}</p>
                </div>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stage.status === "completed" ? "bg-green-600" : "bg-[#00B4D8]"
                  }`}
                  style={{ width: `${stage.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Quality Metrics */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1A365D] mb-2">Data Quality Metrics</h2>
          <p className="text-sm text-[#64748B]">Quality assessment of processed data</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dataQuality.map((item, index) => (
            <div key={index} className="bg-[#F8FAFC] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#64748B]">{item.metric}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  item.status === "excellent"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {item.status.toUpperCase()}
                </span>
              </div>
              <p className="text-3xl font-bold text-[#1A365D] mb-2">{item.score}%</p>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    item.status === "excellent" ? "bg-green-600" : "bg-yellow-500"
                  }`}
                  style={{ width: `${item.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#1A365D] mb-2">Recent Pipeline Activity</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg">
            <Upload className="w-5 h-5 text-[#00B4D8] mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[#1A365D] font-semibold">Data ingestion completed</p>
              <p className="text-sm text-[#64748B]">127,458 records imported from ophthalmic sales database</p>
              <p className="text-xs text-[#64748B] mt-1">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[#1A365D] font-semibold">Data cleaning finished</p>
              <p className="text-sm text-[#64748B]">2,566 duplicate records removed, 124,892 records validated</p>
              <p className="text-xs text-[#64748B] mt-1">1 hour ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-900 font-semibold">Feature engineering in progress</p>
              <p className="text-sm text-yellow-700">Processing 68% complete, approximately 10 minutes remaining</p>
              <p className="text-xs text-yellow-600 mt-1">Currently running</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
