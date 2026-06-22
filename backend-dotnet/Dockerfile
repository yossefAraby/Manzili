# Multi-stage build for the Manzili .NET 10 API (parity with the Node Dockerfile).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore (layer-cached on csproj changes)
COPY Manzili.slnx ./
COPY src/Manzili.Api/Manzili.Api.csproj src/Manzili.Api/
COPY src/Manzili.Domain/Manzili.Domain.csproj src/Manzili.Domain/
COPY src/Manzili.Application/Manzili.Application.csproj src/Manzili.Application/
COPY src/Manzili.Infrastructure/Manzili.Infrastructure.csproj src/Manzili.Infrastructure/
RUN dotnet restore src/Manzili.Api/Manzili.Api.csproj

# Build & publish
COPY . .
RUN dotnet publish src/Manzili.Api/Manzili.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
# Provide configuration via environment, e.g.:
#   ConnectionStrings__Default, Manzili__Jwt__Secret, Manzili__Jwt__RefreshSecret,
#   Manzili__Stripe__SecretKey, Manzili__Cloudinary__*, Manzili__Bosta__*
ENTRYPOINT ["dotnet", "Manzili.Api.dll"]
