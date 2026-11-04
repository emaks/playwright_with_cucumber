package io.materialspace.framework.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;

import java.lang.reflect.Type;

public class ObjectMapperUtils {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @SneakyThrows
    public static <T> T readValue(String fromValue, Class<T> toValueType) {
        return MAPPER.readValue(fromValue, toValueType);
    }

    @SneakyThrows
    public static String writeValueAsString(Object value) {
        return MAPPER.writeValueAsString(value);
    }

    public static Object convertValue(Object fromValue, Type toValueType) {
        return MAPPER.convertValue(fromValue, MAPPER.constructType(toValueType));
    }

    public static <T> T convertValue(Object fromValue, Class<T> toValueType) {
        return MAPPER.convertValue(fromValue, toValueType);
    }
}
