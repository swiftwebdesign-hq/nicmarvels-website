"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const PROGRAMS = [
  "Beginners → Advanced (8 Months)",
  "Intermediate → Advanced (5 Months)",
  "Beginners → Intermediate (4 Months)",
  "Beginners (3 Months)",
  "Intermediate (3 Months)",
  "Advanced Class (3 Months)",
] as const;

export function EnrollmentForm() {
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [passportName, setPassportName] = useState("No file chosen");
  const [signatureName, setSignatureName] = useState("No file chosen");

  // Mobile menu (presentational only)
  useEffect(() => {
    const menuToggle = document.getElementById("menuToggle");
    const siteNav = document.getElementById("siteNav");
    if (!menuToggle || !siteNav) return;

    const toggle = () => {
      const isOpen = siteNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    };
    menuToggle.addEventListener("click", toggle);
    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
    return () => menuToggle.removeEventListener("click", toggle);
  }, []);

  function validateFile(file: File | null): string | null {
    if (!file) return null;
    if (!ALLOWED_TYPES.has(file.type)) return "Please choose a JPG, PNG or WEBP image.";
    if (file.size > MAX_BYTES) return "Please choose an image smaller than 2 MB.";
    return null;
  }

  async function uploadFile(
    file: File,
    prefix: string
  ): Promise<string | null> {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "enrollments";

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (error) {
      console.error("Storage upload failed:", error);
      throw new Error("Could not upload one of the images. Please try again.");
    }
    return path;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot
    if (formData.get("website")) return;

    if (!form.reportValidity()) {
      const firstInvalid = form.querySelector(":invalid") as HTMLElement | null;
      firstInvalid?.focus({ preventScroll: true });
      return;
    }

    const passport = (formData.get("passportPhoto") as File) || null;
    const signature = (formData.get("signature") as File) || null;

    const passportErr = validateFile(passport);
    const signatureErr = validateFile(signature);
    if (passportErr || signatureErr) {
      setMessage({ text: passportErr || signatureErr || "Invalid file", type: "error" });
      return;
    }

    setSubmitting(true);

    try {
      // Upload files first via Supabase client (so Realtime can see the row later)
      let passportFilePath: string | null = null;
      let signatureFilePath: string | null = null;

      if (passport && passport.size > 0) {
        passportFilePath = await uploadFile(passport, "passport");
      }
      if (signature && signature.size > 0) {
        signatureFilePath = await uploadFile(signature, "signature");
      }

      // Build row matching Prisma model / table
      const row = {
        firstName: String(formData.get("firstName") || "").trim(),
        middleName: String(formData.get("middleName") || "").trim() || null,
        lastName: String(formData.get("lastName") || "").trim(),
        email: String(formData.get("email") || "").trim().toLowerCase(),
        dateOfBirth: String(formData.get("dateOfBirth") || "").trim(),
        maritalStatus: String(formData.get("maritalStatus") || ""),
        pregnant: String(formData.get("pregnant") || ""),
        addressLine1: String(formData.get("addressLine1") || "").trim(),
        addressLine2: String(formData.get("addressLine2") || "").trim() || null,
        city: String(formData.get("city") || "").trim(),
        state: String(formData.get("state") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        gender: String(formData.get("gender") || ""),
        sewingExperience: String(formData.get("sewingExperience") || ""),
        program: String(formData.get("program") || ""),
        estimatedStartDate: String(formData.get("estimatedStartDate") || "").trim() || null,
        guardianFirstName: String(formData.get("guardianFirstName") || "").trim() || null,
        guardianLastName: String(formData.get("guardianLastName") || "").trim() || null,
        guardianAddress: String(formData.get("guardianAddress") || "").trim() || null,
        guardianPhone: String(formData.get("guardianPhone") || "").trim() || null,
        guardianEmail: String(formData.get("guardianEmail") || "").trim() || null,
        declarationAccepted: true,
        passportFilePath,
        signatureFilePath,
        processed: false,
        submissionTime: new Date().toISOString(),
      };

      // CRITICAL: insert via Supabase client (not Prisma) so Realtime fires
      const { error } = await supabase.from("Enrollments").insert(row);

      if (error) {
        console.error("Insert failed:", error);
        // Clean up uploaded files on failure
        const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "enrollments";
        if (passportFilePath) {
          await supabase.storage.from(bucket).remove([passportFilePath]).catch(() => {});
        }
        if (signatureFilePath) {
          await supabase.storage.from(bucket).remove([signatureFilePath]).catch(() => {});
        }
        throw new Error(
          error.message.includes("policy") || error.code === "42501"
            ? "Applications are not connected yet. Please contact the academy."
            : "Your application could not be sent. Please try again or contact the academy."
        );
      }

      form.reset();
      setPassportName("No file chosen");
      setSignatureName("No file chosen");
      setMessage({
        text: "Thank you. Your application has been received by the academy.",
        type: "success",
      });
      document.getElementById("formMessage")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Your application could not be sent.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="enrollmentForm" className="enrollment-form" noValidate onSubmit={handleSubmit}>
      <input
        className="trap-field"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <section aria-labelledby="bio-title">
        <h2 id="bio-title">Student Bio Data</h2>
        <div className="field-grid">
          <label className="field">
            <span>
              First Name <b className="required">*</b>
            </span>
            <input name="firstName" autoComplete="given-name" required maxLength={120} />
          </label>
          <label className="field">
            <span>Middle Name</span>
            <input name="middleName" autoComplete="additional-name" maxLength={120} />
          </label>
          <label className="field">
            <span>
              Last Name <b className="required">*</b>
            </span>
            <input name="lastName" autoComplete="family-name" required maxLength={120} />
          </label>
          <label className="field">
            <span>
              Email <b className="required">*</b>
            </span>
            <input type="email" name="email" autoComplete="email" required maxLength={320} />
          </label>
          <label className="field">
            <span>
              Date of Birth <b className="required">*</b>
            </span>
            <input type="date" name="dateOfBirth" required />
          </label>
        </div>

        <fieldset className="choice-field">
          <legend>
            Marital Status <b className="required">*</b>
          </legend>
          <div className="radio-stack">
            <label>
              <input type="radio" name="maritalStatus" value="Single" required />
              <span>Single</span>
            </label>
            <label>
              <input type="radio" name="maritalStatus" value="Married" />
              <span>Married</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="choice-field">
          <legend>
            Are you Pregnant? <b className="required">*</b>
          </legend>
          <div className="radio-stack">
            <label>
              <input type="radio" name="pregnant" value="Yes" required />
              <span>Yes</span>
            </label>
            <label>
              <input type="radio" name="pregnant" value="No" />
              <span>No</span>
            </label>
          </div>
        </fieldset>

        <div className="field-grid">
          <label className="field">
            <span>
              Address Line 1 <b className="required">*</b>
            </span>
            <input name="addressLine1" autoComplete="address-line1" required maxLength={500} />
          </label>
          <label className="field">
            <span>Address Line 2</span>
            <input name="addressLine2" autoComplete="address-line2" maxLength={500} />
          </label>
          <label className="field">
            <span>
              City <b className="required">*</b>
            </span>
            <input name="city" autoComplete="address-level2" required maxLength={160} />
          </label>
          <label className="field">
            <span>
              State <b className="required">*</b>
            </span>
            <input name="state" autoComplete="address-level1" required maxLength={160} />
          </label>
          <label className="field">
            <span>
              Phone <b className="required">*</b>
            </span>
            <input type="tel" name="phone" autoComplete="tel" required maxLength={80} />
          </label>
        </div>

        <fieldset className="choice-field">
          <legend>
            Gender <b className="required">*</b>
          </legend>
          <div className="radio-stack">
            <label>
              <input type="radio" name="gender" value="Male" required />
              <span>Male</span>
            </label>
            <label>
              <input type="radio" name="gender" value="Female" />
              <span>Female</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="choice-field">
          <legend>
            Do you have any sewing experience? <b className="required">*</b>
          </legend>
          <div className="radio-stack">
            <label>
              <input type="radio" name="sewingExperience" value="Yes" required />
              <span>Yes</span>
            </label>
            <label>
              <input type="radio" name="sewingExperience" value="No" />
              <span>No</span>
            </label>
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="program-title">
        <h2 id="program-title">Programme Selection</h2>
        <fieldset className="choice-field">
          <legend>
            Preferred Programme <b className="required">*</b>
          </legend>
          <div className="radio-stack">
            {PROGRAMS.map((p) => (
              <label key={p}>
                <input type="radio" name="program" value={p} required />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>
            Passport Photograph <b className="required">*</b>
          </span>
          <span className="upload-control">
            <input
              type="file"
              name="passportPhoto"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPassportName(f ? f.name : "No file chosen");
              }}
            />
            <span className="upload-button">Choose File</span>
            <span className="upload-name" id="passportName">
              {passportName}
            </span>
          </span>
        </label>

        <label className="field">
          <span>
            Estimated Program Start Date <b className="required">*</b>
          </span>
          <input type="date" name="estimatedStartDate" required />
        </label>
      </section>

      <section aria-labelledby="guardian-title">
        <h2 id="guardian-title">Parent/Guarantor Information</h2>
        <div className="field-grid">
          <label className="field">
            <span>
              Parent/Guardian (First Name) <b className="required">*</b>
            </span>
            <input name="guardianFirstName" required maxLength={120} />
          </label>
          <label className="field">
            <span>(Last Name)</span>
            <input name="guardianLastName" maxLength={120} />
          </label>
          <label className="field">
            <span>
              Parent/Guardian Address <b className="required">*</b>
            </span>
            <input name="guardianAddress" required maxLength={500} />
          </label>
          <label className="field">
            <span>
              Parent/Guardian Phone <b className="required">*</b>
            </span>
            <input type="tel" name="guardianPhone" required maxLength={80} />
          </label>
          <label className="field">
            <span>
              Parent/Guardian Email <b className="required">*</b>
            </span>
            <input type="email" name="guardianEmail" required maxLength={320} />
          </label>
        </div>
      </section>

      <section aria-labelledby="declaration-title">
        <h2 id="declaration-title">Declaration</h2>
        <label className="agree-row">
          <input type="checkbox" name="declarationAccepted" value="yes" required />
          <span>
            I agree and confirm that the information I have provided is authentic.{" "}
            <b className="required">*</b>
          </span>
        </label>

        <label className="field">
          <span>
            Signature (image) <b className="required">*</b>
          </span>
          <span className="upload-control">
            <input
              type="file"
              name="signature"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) => {
                const f = e.target.files?.[0];
                setSignatureName(f ? f.name : "No file chosen");
              }}
            />
            <span className="upload-button">Choose File</span>
            <span className="upload-name" id="signatureName">
              {signatureName}
            </span>
          </span>
        </label>
      </section>

      <p
        id="formMessage"
        className={`form-message ${message.type}`}
        aria-live="polite"
        role="status"
      >
        {message.text}
      </p>

      <button type="submit" disabled={submitting}>
        {submitting ? "Sending application…" : "Submit Form"}
      </button>
    </form>
  );
}
