export type Package = {
    name: string, // Exemplo: "resultados", "candidatos"
    group: string,
    year: string,
    resources: any[]
}

export type Group = {
    name: string,
    packages: Package[]
}

export type ListResponse = {
    help: string,
    success: boolean,
    result: string[]
}

export type DetailResponse = {
    help: string,
    success: boolean,
    result: any
}
