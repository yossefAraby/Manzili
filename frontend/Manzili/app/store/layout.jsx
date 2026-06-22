import StoreLayout from "@/components/store/StoreLayout";


export const metadata = {
    title: "Manzili. - Store Dashboard",
    description: "Manzili. - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
