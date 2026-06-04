import { FileText, Mail, Upload, X } from "lucide-react";
import { showToast } from "@/app/_components/CustomToast";
import { FieldSection, useWatch } from "@/app/_components/forms";

export default function TenantContractUpload({ contractFile, setContractFile }) {
  const email = useWatch({ name: "email" });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast.error("File size must be less than 10MB");
      return;
    }
    setContractFile(file);
  };

  return (
    <FieldSection title="Contract Document" columns={1}>
      {!contractFile ? (
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-stone-300 transition-colors hover:border-blue-700 hover:bg-blue-50/50">
          <Upload className="mb-2 h-8 w-8 text-black/40" strokeWidth={1.8} />
          <span className="text-sm text-black/70">
            Click to upload contract
          </span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
            PDF, DOC, DOCX (max 10MB)
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between border border-blue-700 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-700" strokeWidth={1.8} />
            <div>
              <p className="text-sm font-bold text-black">
                {contractFile.name}
              </p>
              <p className="text-[11px] text-black/55">
                {(contractFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setContractFile(null)}
            className="p-1 text-black/55 hover:text-red-600"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
      )}
      {email && contractFile && (
        <p className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">
          <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
          Will be sent to {email}
        </p>
      )}
    </FieldSection>
  );
}
