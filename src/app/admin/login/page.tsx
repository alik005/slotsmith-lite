import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin login", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <div className="card space-y-4">
        <h1 className="text-xl font-bold">Admin login</h1>
        <LoginForm />
      </div>
    </div>
  );
}
