import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <LoginForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
