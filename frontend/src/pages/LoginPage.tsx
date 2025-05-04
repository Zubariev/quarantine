
import React from "react";
import { LoginForm } from "components/LoginForm";
import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-rose-100 p-4">
      <LoginForm />
      <p className="mt-4 text-center text-sm text-stone-600">
        Don't have an account?{" "}
        <Link to="/sign-up" className="font-medium text-orange-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
