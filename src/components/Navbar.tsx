import Link from "next/link";
import MaxWidthWrapper from "./MaxWidthWrapper";
import { buttonVariants } from "./ui/button";
import { LoginLink, RegisterLink, getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { ArrowRight } from "lucide-react";
import UserAccountNav from "./UserAccountNav";
import MobileNav from "./MobileNav";
import { SOURCE_CODE } from "@/config/links";
import Image from "next/image";

const Navbar = async () => {



    const {getUser} = getKindeServerSession()
    const user = await getUser()
  return (
    <nav className="sticky h-14 inset-x-0 top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-lg transition-all">
        <MaxWidthWrapper>
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 ">
                <Link href="/" className="flex z-40 font-semibold ">
                    <span>PowerPDF</span>
                </Link>

                <div className="flex items-center justify-center space-x-4">

                <MobileNav isAuth={!!user}/>

                <div className="hidden sm:flex">
                    { !user ? <>
                        <Link href="/pricing" className={buttonVariants({
                            variant: "ghost",
                            size: "sm"
                        })}>Pricing</Link>

                        <LoginLink className={buttonVariants({
                            variant: "ghost",
                            size: "sm"
                        })}>Sign in</LoginLink>
            
                        <RegisterLink className={buttonVariants({
                            size: "sm"
                        })}>Get Started <ArrowRight className="ml-1.5 h-5 w-5"/>
                        </RegisterLink>
            
                    </> : <>
                    <Link href="/dashboard" className={buttonVariants({
                            variant: "ghost",
                            size: "sm"
                        })}>Dashboard</Link>

                        <UserAccountNav email={user.email ?? ""} imageUrl={user.picture ?? ''} name={
                            !user.given_name || !user.family_name ? "Your Account" : `${user.given_name} ${user.family_name}`
                        }/>
                    </>}
                </div>

                <Link href={SOURCE_CODE} target="_blank" rel='noreferrer noopener'>
                    <Image src="/github.svg" height={25} width={25} alt="Github"/>
                </Link>
            </div>   
            </div>
        </MaxWidthWrapper>
    </nav>
  );
};

export default Navbar;
