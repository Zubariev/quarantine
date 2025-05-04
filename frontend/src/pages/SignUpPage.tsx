
import React from "react";
import { SignUpForm } from "components/SignUpForm";
import { Link } from "react-router-dom";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-rose-100 p-4">
      <SignUpForm />
      <p className="mt-4 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-orange-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
