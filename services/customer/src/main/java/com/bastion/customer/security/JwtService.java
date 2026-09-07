package com.bastion.customer.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@Service
public class JwtService {

    private final String jwtSecret;

    // Inject shared secret from application.properties
    public JwtService(@Value("${jwt.secret}") String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    /**
     * Validate JWT Bearer token and extract the identity user ID.
     *
     * @param authHeader Authorization header string (e.g. "Bearer eyJhbGci...")
     * @return Extracted identity user ID as UUID
     * @throws ResponseStatusException HTTP 401 if header or token is missing, invalid, or expired
     */
    public UUID extractUserIdFromToken(String authHeader) {
        // 1. Check if Authorization header is present and starts with Bearer prefix
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
        }

        // 2. Strip "Bearer " prefix (first 7 characters) to extract the raw token
        String token = authHeader.substring(7);

        try {
            // 3. Verify HMAC-SHA256 signature and expiration
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);

            // 4. Retrieve user_id claim (custom claim injected by Identity Service)
            String userIdStr = decodedJWT.getClaim("user_id").asString();
            if (userIdStr == null) {
                // Fallback to standard subject (sub) claim
                userIdStr = decodedJWT.getSubject();
            }

            if (userIdStr == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token does not contain user ID");
            }

            return UUID.fromString(userIdStr);
        } catch (Exception e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
    }
}
