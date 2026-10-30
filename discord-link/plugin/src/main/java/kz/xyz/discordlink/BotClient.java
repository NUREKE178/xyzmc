package kz.xyz.discordlink;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Collection;
import java.util.concurrent.CompletableFuture;

/** Клиент внутреннего API Discord-бота. Все методы асинхронные — главный поток не блокируют. */
public final class BotClient {

    /** Результат запроса: HTTP-статус, ключ ошибки бота (invalid_code, already_linked, ...) и флаг linked из /api/status. */
    public record Result(int status, String error, boolean linked) {
        public boolean ok() {
            return status == 200;
        }
    }

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private volatile String baseUrl;
    private volatile String secret;

    public BotClient(String baseUrl, String secret) {
        configure(baseUrl, secret);
    }

    public void configure(String baseUrl, String secret) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.secret = secret;
    }

    public CompletableFuture<Result> link(String code, String uuid, String name) {
        JsonObject body = new JsonObject();
        body.addProperty("code", code);
        body.addProperty("uuid", uuid);
        body.addProperty("name", name);
        return post("/api/link", body);
    }

    public CompletableFuture<Result> sync(String uuid, String name, Collection<String> groups) {
        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid);
        body.addProperty("name", name);
        JsonArray arr = new JsonArray();
        groups.forEach(arr::add);
        body.add("groups", arr);
        return post("/api/sync", body);
    }

    public CompletableFuture<Result> unlink(String uuid) {
        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid);
        return post("/api/unlink", body);
    }

    public CompletableFuture<Result> status(String uuid) {
        HttpRequest req = base("/api/status?uuid=" + uuid).GET().build();
        return send(req);
    }

    private CompletableFuture<Result> post(String path, JsonObject body) {
        HttpRequest req = base(path)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();
        return send(req);
    }

    private HttpRequest.Builder base(String path) {
        return HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(8))
                .header("Authorization", "Bearer " + secret);
    }

    private CompletableFuture<Result> send(HttpRequest req) {
        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenApply(res -> parse(res.statusCode(), res.body()));
    }

    private static Result parse(int status, String body) {
        try {
            JsonObject o = JsonParser.parseString(body).getAsJsonObject();
            String error = o.has("error") ? o.get("error").getAsString() : "";
            boolean linked = o.has("linked") && o.get("linked").getAsBoolean();
            return new Result(status, error, linked);
        } catch (RuntimeException e) {
            return new Result(status, "", false);
        }
    }
}
