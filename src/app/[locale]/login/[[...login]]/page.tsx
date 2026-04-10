import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center px-6">
      {/* Decorative elements matching main site */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#BD7C48]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-[#BD7C48]/5 rounded-full blur-3xl" />

      <SignIn
        redirectUrl="/dashboard"
        appearance={{
          variables: {
            colorBackground: "#ffffff",
            colorText: "#0a0a0a",
            colorPrimary: "#BD7C48",
          },
          elements: {
            rootBox: "mx-auto",
            card: "bg-white shadow-2xl border border-neutral-200 rounded-2xl",
            main: "bg-transparent",
            headerTitle: "text-neutral-900 text-2xl font-black",
            headerSubtitle: "text-neutral-600 font-medium",
            socialButtonsBlockButton: "bg-white border-2 border-neutral-200 text-neutral-900 hover:bg-neutral-50 hover:border-[#BD7C48] transition-all font-bold rounded-xl",
            socialButtonsBlockButtonText: "text-neutral-900 font-bold",
            socialButtonsBlockButtonArrow: "text-neutral-900",
            dividerLine: "bg-neutral-200",
            dividerText: "text-neutral-600 font-medium",
            formFieldInput: "bg-white border-2 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-[#BD7C48] focus:ring-[#BD7C48] rounded-xl font-medium",
            formFieldLabel: "text-neutral-900 font-bold",
            formButtonPrimary: "bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5",
            footerActionLink: "text-[#BD7C48] hover:text-[#A0673D] font-bold",
            footerActionText: "text-neutral-600 font-medium",
            identityPreviewText: "text-neutral-900",
            identityPreviewEditButton: "text-[#BD7C48] hover:text-[#A0673D]",
            formContainer: "bg-transparent",
            form: "bg-transparent",
            footer: "bg-transparent",
            socialButtons: "bg-transparent",
            socialButtonsProviderIcon: "text-neutral-900",
            formFieldRow: "bg-transparent",
            formField: "bg-transparent",
            formHeaderTitle: "text-neutral-900 font-black",
            formHeaderSubtitle: "text-neutral-600 font-medium",
            alternativeMethodsBlockButton: "bg-white border-2 border-neutral-200 text-neutral-900 hover:bg-neutral-50 hover:border-[#BD7C48] rounded-xl",
            alternativeMethodsBlockButtonText: "text-neutral-900 font-medium",
            otpCodeFieldInput: "bg-white border-2 border-neutral-200 text-neutral-900 focus:border-[#BD7C48] rounded-xl",
            formResendCodeLink: "text-[#BD7C48] hover:text-[#A0673D] font-bold",
            formFieldErrorText: "text-red-600 font-medium",
            formFieldSuccessText: "text-green-600 font-medium",
            formFieldHintText: "text-neutral-500 font-medium",
            formFieldInputShowPasswordButton: "text-neutral-500 hover:text-neutral-900",
            modalContent: "bg-white rounded-2xl",
            modalCloseButton: "text-neutral-500 hover:text-neutral-900"
          }
        }}
      />
    </div>
  );
}
