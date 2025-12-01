import Image from "next/image";

const Logo = () => {
  return (
    <div className="flex justify-center mt-20">
    <Image
        src="https://gajian.duluin.com/assets/img/logo-duluin-gajian.png"
        alt="Duluin Gajian"
        className="h-12"
        width={120}
        height={48}
    />
    </div>
  )
};

export default Logo;
