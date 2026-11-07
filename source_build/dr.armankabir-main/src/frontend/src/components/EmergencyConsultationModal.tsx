import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { AlertTriangle, Phone, Send } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EmergencyConsultationModal({ open, onClose }: Props) {
  const { config, isLoading, isError } = useSiteConfig();
  const emergencyContacts = config.emergencyContacts;

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [doctor, setDoctor] = useState("");
  const [error, setError] = useState("");

  const handleSend = () => {
    if (!name.trim() || !age || !symptoms.trim() || !doctor) {
      setError("Please fill in all required fields before sending. / পাঠানোর আগে প্রয়োজনীয় তথ্য পূরণ করুন।");
      return;
    }
    setError("");
    const contact = emergencyContacts.find((c) => c.doctorName === doctor);
    const number = contact?.whatsappNumber || "";
    const phonePart = phone ? `\nPhone: ${phone}` : "";
    const baseMessage = [
      contact?.prefilledMessage || `Emergency Consultation Request\n\nDoctor: ${doctor}`,
      contact?.prefilledMessageBn,
    ].filter(Boolean).join("\n\n");
    const message = `🚨 ${baseMessage}\n\nName: ${name}\nAge: ${age} years${phonePart}\nSymptoms: ${symptoms}\n\nSent from Dr. Arman Kabir's Care portal.`;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    // reset
    setName("");
    setAge("");
    setPhone("");
    setSymptoms("");
    setDoctor("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="emergency.dialog">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle className="text-destructive text-lg font-bold">
              Emergency Consultation
              <span className="block text-base" lang="bn">জরুরি পরামর্শ</span>
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Fill in your details and we will connect you with a doctor via
            WhatsApp immediately.
            <span className="block mt-1" lang="bn">তথ্য দিন, আমরা হোয়াটসঅ্যাপের মাধ্যমে চিকিৎসকের সঙ্গে যোগাযোগ করব।</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="em-name">Patient Name *<span className="block text-xs" lang="bn">রোগীর নাম</span></Label>
            <Input
              id="em-name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-ocid="emergency.input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="em-age">Age *<span className="block text-xs" lang="bn">বয়স</span></Label>
              <Input
                id="em-age"
                type="number"
                placeholder="Age (years)"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={0}
                max={120}
                data-ocid="emergency.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="em-phone">Phone<span className="block text-xs" lang="bn">ফোন নম্বর</span></Label>
              <Input
                id="em-phone"
                type="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-ocid="emergency.input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Select Doctor *<span className="block text-xs" lang="bn">চিকিৎসক নির্বাচন করুন</span></Label>
            {isLoading && (
              <p className="text-xs text-muted-foreground" role="status">
                Loading doctors…
              </p>
            )}
            {isError && (
              <p className="text-xs text-destructive" role="alert">
                Could not load saved emergency contacts.
              </p>
            )}
            <Select value={doctor} onValueChange={setDoctor}>
              <SelectTrigger data-ocid="emergency.select">
                <SelectValue placeholder="Choose a doctor" />
              </SelectTrigger>
              <SelectContent>
                {emergencyContacts.map((c) => (
                  <SelectItem key={c.doctorName} value={c.doctorName}>
                    {c.doctorName}<span className="ml-2" lang="bn">{c.doctorNameBn}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="em-symptoms">Symptoms / Complaint *<span className="block text-xs" lang="bn">লক্ষণ / সমস্যা</span></Label>
            <Textarea
              id="em-symptoms"
              placeholder="Describe your emergency symptoms briefly..."
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              data-ocid="emergency.textarea"
            />
          </div>

          {error && (
            <p
              className="text-sm text-destructive"
              data-ocid="emergency.error_state"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-ocid="emergency.cancel_button"
            >
              Cancel / বাতিল
            </Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white gap-2"
              onClick={handleSend}
              data-ocid="emergency.submit_button"
            >
              <Send className="w-4 h-4" />
              Send via WhatsApp / হোয়াটসঅ্যাপে পাঠান
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Phone className="w-3 h-3 shrink-0" />
            <span>
              This will open WhatsApp with a pre-filled message to the selected
              doctor&apos;s number.
              <span className="block mt-1" lang="bn">নির্বাচিত চিকিৎসকের নম্বরে বার্তাসহ হোয়াটসঅ্যাপ খুলবে।</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
